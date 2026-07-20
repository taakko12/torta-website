import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 300

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

type DiscordEmbed = {
  title?: string; description?: string; author?: { name?: string }
  thumbnail?: { url?: string }; image?: { url?: string }; fields?: { name: string; value: string }[]
}
type DiscordMessage = {
  id: string; webhook_id?: string; content?: string; embeds: DiscordEmbed[]
  attachments?: { url: string }[]
}

function dateToSnowflake(date: Date): string {
  return ((BigInt(date.getTime()) - 1420070400000n) << 22n).toString()
}

function snowflakeToDate(id: string): string {
  return new Date(Number(BigInt(id) >> 22n) + 1420070400000).toISOString()
}

function isLootEmbed(embed: DiscordEmbed): boolean {
  const text = `${embed.title ?? ''} ${embed.description ?? ''}`
  return /loot|looted|received a drop|drop:/i.test(text)
}

function parseGpString(str: string): number | null {
  const clean = str.replace(/,/g, '').trim()
  const match = clean.match(/^([\d.]+)\s*([KMBkmb])?/)
  if (!match) return null
  const num = parseFloat(match[1])
  const suffix = (match[2] ?? '').toUpperCase()
  if (suffix === 'B') return Math.round(num * 1_000_000_000)
  if (suffix === 'M') return Math.round(num * 1_000_000)
  if (suffix === 'K') return Math.round(num * 1_000)
  return Math.round(num)
}

function parseLootGp(embed: DiscordEmbed): number | null {
  for (const field of embed.fields ?? []) {
    if (/total\s*value/i.test(field.name)) {
      const gp = parseGpString(field.value.replace(/\s*gp/i, '').trim())
      if (gp != null) return gp
    }
  }
  const desc = embed.description ?? ''
  const allMatches = [...desc.matchAll(/\(([\d.,]+[KMBkmb]?)\)/g)]
  if (allMatches.length > 0) {
    const values = allMatches.map(m => parseGpString(m[1]) ?? 0)
    return Math.max(...values)
  }
  const gpMatch = desc.match(/([\d.,]+[KMBkmb]?)\s*gp/i)
  if (gpMatch) return parseGpString(gpMatch[1])
  return null
}

function parseLootPlayer(embed: DiscordEmbed, content?: string): string | null {
  const authorName = embed.author?.name ?? ''
  if (authorName) return authorName.trim()
  const desc = embed.description ?? ''
  const descMatch = desc.match(/^(.+?)\s+has looted/i)
  if (descMatch) return descMatch[1].trim()
  if (content) {
    const m = content.match(/^(.+?)\s+has looted/i)
    if (m) return m[1].trim()
  }
  return null
}

function parseLootItem(embed: DiscordEmbed): string {
  const desc = embed.description ?? ''
  const itemMatch = desc.match(/\d+\s*x\s+(.+?)\s*\(/)
  if (itemMatch) {
    const raw = itemMatch[1].trim()
    return raw.startsWith('[') ? raw.replace(/^\[([^\]]+)\].*$/, '$1') : raw
  }
  const title = embed.title ?? ''
  if (title) {
    const stripped = title.replace(/^(valuable\s+drop|loot\s+drop|loot|drop)\s*:?\s*/i, '').trim()
    if (stripped && !/^(drop|loot)$/i.test(stripped)) return stripped
  }
  return desc.split('\n')[0].replace(/\([\d.,]+[KMBkmb]?\)/g, '').replace(/has looted/i, '').trim() || 'Unknown item'
}

async function fetchMessages(channelId: string, afterSnowflake: string | null, token: string): Promise<DiscordMessage[]> {
  const all: DiscordMessage[] = []
  let lastId = afterSnowflake
  while (true) {
    const params = new URLSearchParams({ limit: '100' })
    if (lastId) params.set('after', lastId)
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages?${params}`, {
      headers: { Authorization: `Bot ${token}` },
    })
    if (!res.ok) break
    const batch: DiscordMessage[] = await res.json()
    if (batch.length === 0) break
    batch.sort((a, b) => a.id.localeCompare(b.id))
    all.push(...batch)
    lastId = batch[batch.length - 1].id
    if (batch.length < 100) break
  }
  return all
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { period } = await req.json() as { period: 'month' | 'all' }
  const token = process.env.DISCORD_BOT_TOKEN!
  const supabase = getSupabaseAdmin()

  const { data: cfg } = await supabase.from('guild_config')
    .select('drops_channel_id').eq('guild_id', GUILD_ID).maybeSingle()

  if (!cfg?.drops_channel_id) return NextResponse.json({ error: 'Drops channel not configured' }, { status: 400 })

  const afterSnowflake = period === 'month'
    ? dateToSnowflake(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    : null

  const messages = await fetchMessages(cfg.drops_channel_id, afterSnowflake, token)

  // Pre-load existing message IDs so we can skip duplicates without N+1 queries
  const { data: existing } = await supabase.from('drops')
    .select('discord_message_id, embed_index')
    .eq('guild_id', GUILD_ID)
    .not('discord_message_id', 'is', null)

  const existingSet = new Set((existing ?? []).map(r => `${r.discord_message_id}:${r.embed_index}`))

  const toInsert: object[] = []
  let skipped = 0

  for (const msg of messages) {
    if (!msg.webhook_id) continue
    for (let i = 0; i < (msg.embeds ?? []).length; i++) {
      const embed = msg.embeds[i]
      if (!isLootEmbed(embed)) continue
      if (existingSet.has(`${msg.id}:${i}`)) { skipped++; continue }

      const name = parseLootPlayer(embed, msg.content)
      const gp = parseLootGp(embed)
      if (!name || !gp || gp <= 0) continue

      toInsert.push({
        guild_id: GUILD_ID,
        player_name: name.toLowerCase(),
        gp_value: gp,
        item_name: parseLootItem(embed),
        recorded_at: snowflakeToDate(msg.id),
        discord_message_id: msg.id,
        embed_index: i,
        image_url: embed.thumbnail?.url ?? null,
        screenshot_url: embed.image?.url ?? (msg.attachments?.[0]?.url ?? null),
      })
    }
  }

  if (toInsert.length > 0) {
    await supabase.from('drops').insert(toInsert)
  }

  return NextResponse.json({ inserted: toInsert.length, skipped, total: messages.length })
}
