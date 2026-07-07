import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = getSupabaseAdmin()
  const [{ data: discord }, { data: ingame }, { data: vc }, { data: links }] = await Promise.all([
    supabase.from('discord_activity').select('discord_id, display_name, role_name, promotion_note, message_count, month_count, last_message_at').eq('guild_id', GUILD_ID).order('month_count', { ascending: false }).limit(200),
    supabase.from('ingame_activity').select('rsn, message_count, month_count, last_message_at').eq('guild_id', GUILD_ID).order('month_count', { ascending: false }).limit(200),
    supabase.from('vc_activity').select('discord_id, display_name, role_name, total_minutes, month_minutes, last_seen_at').eq('guild_id', GUILD_ID).order('month_minutes', { ascending: false }).limit(200),
    supabase.from('rsn_links').select('discord_id, rsn').eq('guild_id', GUILD_ID),
  ])

  const rsnMap = Object.fromEntries((links ?? []).map(l => [l.discord_id, l.rsn]))
  const discordWithRsn = (discord ?? []).map(d => ({ ...d, rsn: rsnMap[d.discord_id] ?? null }))

  return NextResponse.json({ discord: discordWithRsn, ingame: ingame ?? [], vc: vc ?? [] })
}

export async function PATCH(req: Request) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { discord_id, note } = await req.json()
  if (!discord_id) return NextResponse.json({ error: 'discord_id required' }, { status: 400 })

  await getSupabaseAdmin().from('discord_activity').update({ promotion_note: note || null }).eq('guild_id', GUILD_ID).eq('discord_id', discord_id)
  return NextResponse.json({ ok: true })
}
