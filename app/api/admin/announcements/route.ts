import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { data } = await getSupabaseAdmin()
    .from('scheduled_announcements')
    .select('id, channel_id, message, scheduled_at, sent_at, created_by, created_at')
    .eq('guild_id', GUILD_ID)
    .order('scheduled_at', { ascending: true })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { channel_id, message, scheduled_at } = await req.json()
  if (!channel_id || !message?.trim() || !scheduled_at) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data, error } = await getSupabaseAdmin()
    .from('scheduled_announcements')
    .insert({ guild_id: GUILD_ID, channel_id, message: message.trim(), scheduled_at, created_by: session.discordId })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  await getSupabaseAdmin().from('scheduled_announcements').delete().eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}
