import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { status } = await req.json()
  await getSupabaseAdmin().from('tickets').update({
    status,
    closed_at: status === 'closed' ? new Date().toISOString() : null,
  }).eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'ticket', status, `#${id}`)
  return NextResponse.json({ ok: true })
}
