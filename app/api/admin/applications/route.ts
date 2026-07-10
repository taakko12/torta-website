import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const s = await getServerSession()
  if (!s || !await isAdmin(s.discordId!)) return null
  return s
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin()
    .from('applications')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status, notes } = await req.json()
  const update: Record<string, unknown> = { status }
  if (notes !== undefined) update.notes = notes
  if (status !== 'pending') { update.reviewed_at = new Date().toISOString(); update.reviewed_by = session.discordId }
  await getSupabaseAdmin().from('applications').update(update).eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await getSupabaseAdmin().from('applications').delete().eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}
