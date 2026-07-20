import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT = process.env.DISCORD_BOT_TOKEN!
const DISCORD = 'https://discord.com/api/v10'

const CATEGORY_COLORS: Record<string, number> = {
  'Bot Update':   0x7c5ce8,
  'Website':      0x5865F2,
  'Rules':        0xED4245,
  'Announcement': 0xc89b3c,
  'Event':        0x57F287,
}

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { data } = await getSupabaseAdmin()
    .from('changelog')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .order('published_at', { ascending: false })
    .limit(100)
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { title, content, category, channelId } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  let discord_message_id: string | null = null

  if (channelId) {
    const color = CATEGORY_COLORS[category] ?? 0x7c5ce8
    const embed = {
      title: `📋 ${title.trim()}`,
      description: content?.trim() || undefined,
      color,
      fields: [{ name: 'Category', value: category || 'Update', inline: true }],
      footer: { text: 'Changelog' },
      timestamp: new Date().toISOString(),
    }
    const res = await fetch(`${DISCORD}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    if (res.ok) {
      const msg = await res.json() as { id: string }
      discord_message_id = msg.id
    }
  }

  const { data, error } = await getSupabaseAdmin().from('changelog').insert({
    guild_id: GUILD_ID,
    title: title.trim(),
    content: content?.trim() || null,
    category: category || 'Update',
    discord_message_id,
    created_by_discord_id: session.discordId,
    created_by_name: session.user?.name ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 })
  logAdminAction(session, 'changelog', 'create', title.trim())
  return NextResponse.json({ entry: data })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  await getSupabaseAdmin().from('changelog').delete().eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'changelog', 'delete', String(id))
  return NextResponse.json({ ok: true })
}
