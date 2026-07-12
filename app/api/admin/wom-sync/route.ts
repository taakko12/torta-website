import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'

export async function POST() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const botUrl = process.env.BOT_BASE_URL
  const secret = process.env.BOT_ADMIN_SECRET
  if (!botUrl || !secret)
    return NextResponse.json({ error: 'BOT_BASE_URL or BOT_ADMIN_SECRET not configured' }, { status: 500 })

  const res = await fetch(`${botUrl}/api/admin/wom-check`, {
    method: 'POST',
    headers: { 'x-admin-secret': secret },
  }).catch(e => ({ ok: false, statusText: e.message }))

  if (!res.ok) return NextResponse.json({ error: `Bot unreachable: ${(res as Response).statusText}` }, { status: 502 })
  return NextResponse.json({ ok: true })
}
