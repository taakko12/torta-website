import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/logAction'

const BOT = process.env.DISCORD_BOT_TOKEN!
const DISCORD = 'https://discord.com/api/v10'

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { discord_id, display_name } = await req.json()
  if (!discord_id) return NextResponse.json({ error: 'discord_id required' }, { status: 400 })

  const dmRes = await fetch(`${DISCORD}/users/@me/channels`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: discord_id }),
  })
  if (!dmRes.ok) return NextResponse.json({ error: 'Could not open DM channel' }, { status: 500 })
  const dm = await dmRes.json() as { id: string }

  const msgRes = await fetch(`${DISCORD}/channels/${dm.id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: "👋 Hey! We noticed you haven't been very active in the clan lately. If you're on a break, use `/absence start` so we know. Otherwise, come hang out — we'd love to see you around! If you have any issues, reach out to a mod." }),
  })
  if (!msgRes.ok) return NextResponse.json({ error: 'Failed to send DM' }, { status: 500 })

  logAdminAction(session, 'warn-dm', null, display_name ?? discord_id)
  return NextResponse.json({ ok: true })
}
