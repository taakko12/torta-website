import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'
const MEDALS = ['🥇', '🥈', '🥉']
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://tortapounders.vercel.app'

function buildEmbed(leaderboard: { player: string; net: number }[]) {
  const top = leaderboard.filter(e => e.net > 0).slice(0, 10)
  const description = top.length === 0
    ? 'No coffer donations yet.'
    : top.map((e, i) => `${MEDALS[i] ?? `${i + 1}.`} **${e.player}** — ${e.net.toLocaleString()} gp`).join('\n')
  return { title: '🏦 Clan Coffer Leaderboard', url: `${SITE}/feed?section=coffer`, description, color: 0xF39C12, timestamp: new Date().toISOString(), footer: { text: 'Updates automatically with each donation' } }
}

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

function computeLeaderboard(deposits: { player: string; gp: number; action: string }[]) {
  const totals: Record<string, { player: string; net: number; deposited: number }> = {}
  for (const row of deposits) {
    if (!totals[row.player]) totals[row.player] = { player: row.player, net: 0, deposited: 0 }
    if (row.action === 'deposited') { totals[row.player].net += Number(row.gp); totals[row.player].deposited += Number(row.gp) }
    else totals[row.player].net -= Number(row.gp)
  }
  return Object.values(totals).sort((a, b) => b.net - a.net)
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const [{ data: deposits }, { data: config }, { data: links }] = await Promise.all([
    db.from('coffer_deposits').select('id, player, gp, action, source, logged_by, recorded_at').eq('guild_id', GUILD_ID).order('recorded_at', { ascending: false }).limit(300),
    db.from('guild_config').select('coffer_channel_id, coffer_leaderboard_channel_id, coffer_leaderboard_message_id').eq('guild_id', GUILD_ID).maybeSingle(),
    db.from('rsn_links').select('rsn').eq('guild_id', GUILD_ID).eq('primary_rsn', true),
  ])

  const leaderboard = computeLeaderboard((deposits ?? []) as { player: string; gp: number; action: string }[])

  return NextResponse.json({
    leaderboard,
    recent: deposits ?? [],
    members: (links ?? []).map((l: { rsn: string }) => l.rsn).sort(),
    config: {
      cofferChannelId: config?.coffer_channel_id ?? null,
      leaderboardChannelId: config?.coffer_leaderboard_channel_id ?? null,
      leaderboardMessageId: config?.coffer_leaderboard_message_id ?? null,
    },
  })
}

export async function POST() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })

  const db = getSupabaseAdmin()
  const [{ data: deposits }, { data: config }] = await Promise.all([
    db.from('coffer_deposits').select('player, gp, action').eq('guild_id', GUILD_ID),
    db.from('guild_config').select('coffer_leaderboard_channel_id, coffer_leaderboard_message_id').eq('guild_id', GUILD_ID).maybeSingle(),
  ])

  const channelId = config?.coffer_leaderboard_channel_id
  if (!channelId) return NextResponse.json({ error: 'Set a Coffer Leaderboard Channel in Settings first.' }, { status: 400 })

  const leaderboard = computeLeaderboard((deposits ?? []) as { player: string; gp: number; action: string }[])
  const embed = buildEmbed(leaderboard)
  const headers = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' }
  const existingId = config?.coffer_leaderboard_message_id

  let messageId: string | null = null
  if (existingId) {
    const patch = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${existingId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ embeds: [embed] }),
    })
    if (patch.ok) messageId = (await patch.json()).id
  }
  if (!messageId) {
    const post = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST', headers, body: JSON.stringify({ embeds: [embed] }),
    })
    if (!post.ok) return NextResponse.json({ error: 'Discord API error — check bot token and channel permissions.' }, { status: 500 })
    messageId = (await post.json()).id
  }

  await db.from('guild_config').upsert({ guild_id: GUILD_ID, coffer_leaderboard_message_id: messageId }, { onConflict: 'guild_id' })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { player, gp, action } = await req.json()
  if (!player || !gp || !['deposited', 'withdrawn'].includes(action))
    return NextResponse.json({ error: 'player, gp, and action (deposited|withdrawn) are required' }, { status: 400 })

  const db = getSupabaseAdmin()
  // Look up the mod's primary RSN so we know who logged it
  const { data: link } = await db.from('rsn_links').select('rsn').eq('guild_id', GUILD_ID).eq('discord_id', session.discordId!).eq('primary_rsn', true).maybeSingle()
  const logged_by = link?.rsn ?? session.discordId!

  const { error } = await db.from('coffer_deposits').insert({
    guild_id: GUILD_ID, player: player.trim(), gp: Number(gp), action, source: 'manual', logged_by,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await getSupabaseAdmin().from('coffer_deposits').delete().eq('id', id).eq('guild_id', GUILD_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
