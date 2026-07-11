import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'
const MEDALS = ['🥇', '🥈', '🥉']

function buildLeaderboardEmbed(board: { users: Record<string, { wins: number }> }, title: string, color: number) {
  const sorted = Object.entries(board.users)
    .filter(([, u]) => u.wins > 0)
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, 3)
  const description = sorted.length === 0
    ? 'No wins recorded yet.'
    : sorted.map(([id, u], i) => `${MEDALS[i] ?? `${i + 1}.`} <@${id}> — **${u.wins}** win${u.wins === 1 ? '' : 's'}`).join('\n\n')
  return { title, color, description, timestamp: new Date().toISOString(), footer: { text: 'Updates automatically whenever wins change' } }
}

async function pushLeaderboardEmbed(board: { users: Record<string, { wins: number }>; leaderboardMessage?: { channelId: string; messageId: string } | null }, title: string, color: number) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token || !board.leaderboardMessage) return
  const { channelId, messageId } = board.leaderboardMessage
  await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [buildLeaderboardEmbed(board, title, color)] }),
  }).catch(() => null)
}

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

async function getGuildData() {
  const db = getSupabaseAdmin()
  const { data } = await db.from('guild_data').select('data').eq('guild_id', GUILD_ID).single()
  const d = data?.data ?? {}
  if (!d.boards) d.boards = {}
  if (!d.boards.botw) d.boards.botw = { users: {}, leaderboardMessage: null }
  if (!d.boards.sotw) d.boards.sotw = { users: {}, leaderboardMessage: null }
  return d
}

async function saveGuildData(data: object) {
  await getSupabaseAdmin().from('guild_data').upsert({ guild_id: GUILD_ID, data }, { onConflict: 'guild_id' })
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const [guildData, { data: discord }] = await Promise.all([
    getGuildData(),
    db.from('discord_activity').select('discord_id, display_name').eq('guild_id', GUILD_ID),
  ])

  const nameMap = Object.fromEntries((discord ?? []).map(d => [d.discord_id, d.display_name]))

  function boardEntries(board: { users: Record<string, { wins: number }> }) {
    return Object.entries(board.users)
      .map(([id, v]) => ({ discord_id: id, display_name: nameMap[id] ?? id, wins: v.wins }))
      .sort((a, b) => b.wins - a.wins)
  }

  return NextResponse.json({
    botw: boardEntries(guildData.boards.botw),
    sotw: boardEntries(guildData.boards.sotw),
    members: (discord ?? []).map(d => ({ discord_id: d.discord_id, display_name: d.display_name })),
  })
}

// POST { type: 'botw'|'sotw', discord_id, action: 'add'|'remove'|'set', amount }
export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { type, discord_id, action, amount } = await req.json()
  if (!['botw', 'sotw'].includes(type) || !discord_id || !['add', 'remove', 'set'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const data = await getGuildData()
  const board = data.boards[type]
  if (!board.users[discord_id]) board.users[discord_id] = { wins: 0 }

  if (action === 'add') board.users[discord_id].wins += (amount ?? 1)
  else if (action === 'remove') board.users[discord_id].wins = Math.max(0, board.users[discord_id].wins - (amount ?? 1))
  else if (action === 'set') board.users[discord_id].wins = Math.max(0, amount ?? 0)

  await saveGuildData(data)
  const label = type === 'botw' ? '💀 Boss of the Week' : '📈 Skill of the Week'
  const color = type === 'botw' ? 0xed4245 : 0x57f287
  pushLeaderboardEmbed(board, label, color) // fire-and-forget
  return NextResponse.json({ wins: board.users[discord_id].wins })
}
