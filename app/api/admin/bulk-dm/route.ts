import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT = process.env.DISCORD_BOT_TOKEN!
const DISCORD = 'https://discord.com/api/v10'

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { roleId, message } = await req.json()
  if (!roleId || !message?.trim()) return NextResponse.json({ error: 'roleId and message required' }, { status: 400 })

  // Fetch all guild members (up to 1000)
  const membersRes = await fetch(`${DISCORD}/guilds/${GUILD_ID}/members?limit=1000`, {
    headers: { Authorization: `Bot ${BOT}` },
    cache: 'no-store',
  })
  if (!membersRes.ok) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  const members = await membersRes.json() as { user: { id: string; bot?: boolean }; roles: string[] }[]

  const targets = members.filter(m => !m.user.bot && m.roles.includes(roleId))

  let sent = 0, failed = 0
  for (const m of targets) {
    try {
      // Open DM channel
      const dmRes = await fetch(`${DISCORD}/users/@me/channels`, {
        method: 'POST',
        headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: m.user.id }),
      })
      if (!dmRes.ok) { failed++; continue }
      const dm = await dmRes.json() as { id: string }
      // Send message
      const msgRes = await fetch(`${DISCORD}/channels/${dm.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.trim() }),
      })
      if (msgRes.ok) sent++; else failed++
    } catch { failed++ }
  }

  logAdminAction(session, 'bulk-dm', null, `role:${roleId} sent:${sent} failed:${failed}`)
  return NextResponse.json({ sent, failed, total: targets.length })
}
