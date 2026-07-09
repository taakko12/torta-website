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

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin().from('promotions').select('*').eq('guild_id', GUILD_ID).order('promoted_at', { ascending: false }).limit(200)
  return NextResponse.json({ promotions: data ?? [] })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discord_id, display_name, rsn, from_role, to_role, notes } = await req.json()
  if (!from_role?.trim() || !to_role?.trim()) return NextResponse.json({ error: 'from_role and to_role required' }, { status: 400 })
  const { data, error } = await getSupabaseAdmin().from('promotions').insert({
    guild_id: GUILD_ID,
    discord_id: discord_id?.trim() || null,
    display_name: display_name?.trim() || null,
    rsn: rsn?.trim().toLowerCase() || null,
    from_role: from_role.trim(),
    to_role: to_role.trim(),
    notes: notes?.trim() || null,
    promoted_by_name: session.user?.name ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  logAdminAction(session, 'promotions', 'add', `${display_name ?? rsn ?? discord_id}: ${from_role} → ${to_role}`)
  return NextResponse.json({ promotion: data })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await getSupabaseAdmin().from('promotions').delete().eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'promotions', 'delete', String(id))
  return NextResponse.json({ ok: true })
}
