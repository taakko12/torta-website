import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { searchParams } = new URL(req.url)
  const discordId = searchParams.get('discord_id')
  const query = getSupabaseAdmin().from('member_notes').select('*').eq('guild_id', GUILD_ID).order('created_at', { ascending: false })
  const { data } = discordId ? await query.eq('discord_id', discordId) : await query.limit(500)
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { discord_id, note } = await req.json()
  if (!discord_id || !note?.trim()) return NextResponse.json({ error: 'discord_id and note required' }, { status: 400 })
  const { data, error } = await getSupabaseAdmin().from('member_notes').insert({
    guild_id: GUILD_ID, discord_id, note: note.trim(),
    created_by_discord_id: session.discordId, created_by_name: session.user?.name ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  logAdminAction(session, 'member-notes', 'add', `${discord_id}: ${note.trim().slice(0, 60)}`)
  return NextResponse.json({ note: data })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  await getSupabaseAdmin().from('member_notes').delete().eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'member-notes', 'delete', String(id))
  return NextResponse.json({ ok: true })
}
