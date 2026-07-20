import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { data } = await getSupabaseAdmin().from('blacklist').select('*').eq('guild_id', GUILD_ID).order('created_at', { ascending: false })
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { discord_id, rsn, reason } = await req.json()
  if (!reason?.trim()) return NextResponse.json({ error: 'reason required' }, { status: 400 })
  if (!discord_id && !rsn) return NextResponse.json({ error: 'discord_id or rsn required' }, { status: 400 })
  const { data, error } = await getSupabaseAdmin().from('blacklist').insert({
    guild_id: GUILD_ID,
    discord_id: discord_id?.trim() || null,
    rsn: rsn?.trim().toLowerCase() || null,
    reason: reason.trim(),
    removed_by_name: session.user?.name ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  logAdminAction(session, 'blacklist', 'add', rsn ?? discord_id)
  return NextResponse.json({ entry: data })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  await getSupabaseAdmin().from('blacklist').delete().eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'blacklist', 'remove', String(id))
  return NextResponse.json({ ok: true })
}
