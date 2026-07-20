import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT = process.env.DISCORD_BOT_TOKEN!
const DISCORD = 'https://discord.com/api/v10'

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

function fmtNumber(n: number) {
  return Math.round(n).toLocaleString('en-US')
}

async function editApprovalMessage(row: Record<string, unknown>, outcome: { label: string; color: number; by: string }) {
  if (!row.discord_channel_id || !row.discord_message_id) return
  const compLabel = row.comp_type === 'botw' ? 'Boss of the Week' : 'Skill of the Week'
  const compEmoji = row.comp_type === 'botw' ? '💀' : '📈'
  const unit = row.comp_type === 'botw' ? 'kc' : 'xp'
  const fields = [
    { name: 'Competition', value: row.title, inline: true },
    { name: 'Gained', value: `${fmtNumber(row.gained as number)} ${unit}`, inline: true },
    row.winner_discord_id
      ? { name: 'Winner', value: `<@${row.winner_discord_id}> (${row.winner_rsn})`, inline: false }
      : { name: '⚠️ No Discord link found', value: `No linked Discord account for RSN **${row.winner_rsn}**.`, inline: false },
    { name: outcome.label, value: outcome.by, inline: true },
  ]
  const embed = { title: `${outcome.label.includes('Approved') ? '✅' : '❌'} ${compEmoji} ${compLabel} Winner ${outcome.label.includes('Approved') ? 'Approved' : 'Rejected'}`, color: outcome.color, fields, timestamp: new Date().toISOString() }
  await fetch(`${DISCORD}/channels/${row.discord_channel_id}/messages/${row.discord_message_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], components: [] }),
  }).catch(() => null)
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdmin()
  const { data } = await db.from('comp_winners').select('*')
    .eq('guild_id', GUILD_ID).not('status', 'in', '(merged)').order('created_at', { ascending: false }).limit(50)
  return NextResponse.json({ winners: data ?? [] })
}

// PATCH { id, action: 'approve'|'reject', discord_id? }
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action, discord_id } = await req.json()
  if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const db = getSupabaseAdmin()
  const { data: row } = await db.from('comp_winners').select('*').eq('id', id).eq('guild_id', GUILD_ID).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.status !== 'pending') return NextResponse.json({ error: `Already resolved (${row.status})` }, { status: 409 })

  const resolvedByName = session.user?.name ?? null
  const winnerDiscordId = discord_id ?? row.winner_discord_id

  if (action === 'reject') {
    await db.from('comp_winners').update({ status: 'rejected', resolved_at: new Date().toISOString(), resolved_by_name: resolvedByName }).eq('id', id)
    editApprovalMessage(row, { label: 'Rejected by', color: 0x5a5a7a, by: session.user?.name ?? 'a mod' })
    logAdminAction(session, 'comp-winners', 'reject', row.title)
    return NextResponse.json({ ok: true })
  }

  if (!winnerDiscordId) return NextResponse.json({ error: 'Select a Discord account before approving' }, { status: 400 })

  const { data: guildRow } = await db.from('guild_data').select('data').eq('guild_id', GUILD_ID).single()
  const guildData = guildRow?.data ?? {}
  if (!guildData.boards) guildData.boards = {}
  if (!guildData.boards[row.comp_type]) guildData.boards[row.comp_type] = { users: {}, leaderboardMessage: null }
  const board = guildData.boards[row.comp_type]
  if (!board.users[winnerDiscordId]) board.users[winnerDiscordId] = { wins: 0 }
  board.users[winnerDiscordId].wins += 1
  await db.from('guild_data').upsert({ guild_id: GUILD_ID, data: guildData }, { onConflict: 'guild_id' })

  if (board.leaderboardMessage) {
    const label = row.comp_type === 'botw' ? '💀 Boss of the Week' : '📈 Skill of the Week'
    const color = row.comp_type === 'botw' ? 0xed4245 : 0x57f287
    const sorted = (Object.entries(board.users) as [string, { wins: number }][])
      .filter(([, u]) => u.wins > 0).sort((a, b) => b[1].wins - a[1].wins).slice(0, 3)
    const medals = ['🥇', '🥈', '🥉']
    const description = sorted.length === 0 ? 'No wins recorded yet.'
      : sorted.map(([uid, u], i) => `${medals[i] ?? `${i + 1}.`} <@${uid}> — **${u.wins}** win${u.wins === 1 ? '' : 's'}`).join('\n\n')
    await fetch(`${DISCORD}/channels/${board.leaderboardMessage.channelId}/messages/${board.leaderboardMessage.messageId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ title: label, color, description, timestamp: new Date().toISOString(), footer: { text: 'Updates automatically whenever wins change' } }] }),
    }).catch(() => null)
  }

  await db.from('comp_winners').update({ status: 'approved', winner_discord_id: winnerDiscordId, resolved_at: new Date().toISOString(), resolved_by_name: resolvedByName }).eq('id', id)
  editApprovalMessage({ ...row, winner_discord_id: winnerDiscordId }, { label: 'Approved by', color: 0x57F287, by: session.user?.name ?? 'a mod' })
  logAdminAction(session, 'comp-winners', 'approve', `<@${winnerDiscordId}>: ${row.title}`)
  return NextResponse.json({ ok: true, wins: board.users[winnerDiscordId].wins })
}
