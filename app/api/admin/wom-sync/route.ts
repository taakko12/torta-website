import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'

export async function POST() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

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
