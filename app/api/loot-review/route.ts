import { NextResponse } from 'next/server'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT_BASE_URL = process.env.BOT_BASE_URL
const BOT_ADMIN_SECRET = process.env.BOT_ADMIN_SECRET

export async function POST(req: Request) {
  const { dropId, label, reason } = await req.json()
  if (!dropId || !label || !reason?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (BOT_BASE_URL && BOT_ADMIN_SECRET) {
    fetch(`${BOT_BASE_URL}/api/loot-review-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': BOT_ADMIN_SECRET },
      body: JSON.stringify({ guildId: GUILD_ID, type: 'drop', label, reason: reason.trim(), requestedBy: 'Community' }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
