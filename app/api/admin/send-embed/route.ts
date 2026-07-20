import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { logAdminAction } from '@/lib/logAction'

const DISCORD_API = 'https://discord.com/api/v10'

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })

  const { channelId, title, description, color } = await req.json()
  if (!channelId || (!title && !description)) {
    return NextResponse.json({ error: 'channelId and at least a title or description are required' }, { status: 400 })
  }

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: title || undefined,
        description: description || undefined,
        color: color ? parseInt(color.replace('#', ''), 16) : 0x7c5ce8,
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Discord API error' }, { status: res.status })
  }

  logAdminAction(session, 'messenger', 'send', title || description?.slice(0, 60) || channelId)
  return NextResponse.json({ ok: true })
}
