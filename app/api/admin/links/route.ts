import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const session = await getServerSession()
  if (!session) return null
  if (!await isAdmin(session.discordId!)) return null
  return session
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdmin()
  const [{ data: links }, { data: activity }] = await Promise.all([
    db.from('rsn_links').select('discord_id, rsn, linked_at').eq('guild_id', GUILD_ID).order('linked_at', { ascending: false }),
    db.from('discord_activity').select('discord_id, display_name').eq('guild_id', GUILD_ID),
  ])
  const nameMap = Object.fromEntries((activity ?? []).filter(a => a.display_name).map(a => [a.discord_id, a.display_name]))
  return NextResponse.json({
    links: (links ?? []).map(l => ({ ...l, display_name: nameMap[l.discord_id] ?? null })),
  })
}

export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discord_id, rsn } = await req.json()
  if (!discord_id?.trim() || !rsn?.trim()) return NextResponse.json({ error: 'discord_id and rsn required' }, { status: 400 })
  const { error } = await getSupabaseAdmin().from('rsn_links').upsert(
    { discord_id: discord_id.trim(), guild_id: GUILD_ID, rsn: rsn.trim().toLowerCase(), linked_at: new Date().toISOString() },
    { onConflict: 'discord_id,guild_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discord_id } = await req.json()
  if (!discord_id) return NextResponse.json({ error: 'discord_id required' }, { status: 400 })
  await getSupabaseAdmin().from('rsn_links').delete().eq('guild_id', GUILD_ID).eq('discord_id', discord_id)
  return NextResponse.json({ ok: true })
}
