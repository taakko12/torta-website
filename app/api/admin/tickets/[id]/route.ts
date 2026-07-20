import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  const db = getSupabaseAdmin()
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    db.from('tickets').select('*').eq('id', id).eq('guild_id', GUILD_ID).single(),
    db.from('ticket_messages').select('*').eq('ticket_id', id).order('sent_at', { ascending: true }),
  ])
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ticket, messages: messages ?? [] })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  const { status } = await req.json()
  await getSupabaseAdmin().from('tickets').update({
    status,
    closed_at: status === 'closed' ? new Date().toISOString() : null,
  }).eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'ticket', status, `#${id}`)
  return NextResponse.json({ ok: true })
}
