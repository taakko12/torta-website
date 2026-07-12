import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT_BASE_URL = process.env.BOT_BASE_URL
const BOT_ADMIN_SECRET = process.env.BOT_ADMIN_SECRET

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, label, reason } = await req.json()
  if (!type || !label || !reason?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (BOT_BASE_URL && BOT_ADMIN_SECRET) {
    fetch(`${BOT_BASE_URL}/api/loot-review-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': BOT_ADMIN_SECRET },
      body: JSON.stringify({ guildId: GUILD_ID, type, label, reason: reason.trim(), requestedBy: session.user?.name ?? 'Unknown' }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
