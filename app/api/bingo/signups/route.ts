import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getServerSession, isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function getActiveEventId(db: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await db.from('bingo_events').select('id').eq('guild_id', GUILD_ID).eq('active', true).maybeSingle()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id')
    ?? await getActiveEventId(getSupabaseAdmin())
  if (!eventId) return NextResponse.json({ signups: [] })
  const { data } = await getSupabaseAdmin()
    .from('bingo_signups')
    .select('*')
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: true })
  return NextResponse.json({ signups: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { rsn, discord_username, expected_playtime, preferred_partner, notes, event_id } = body
  if (!rsn?.trim()) return NextResponse.json({ error: 'RSN is required' }, { status: 400 })

  const db = getSupabaseAdmin()
  const targetEventId = event_id ?? await getActiveEventId(db)
  if (!targetEventId) return NextResponse.json({ error: 'No active bingo event' }, { status: 400 })

  const { data: existing } = await db.from('bingo_signups')
    .select('id').eq('event_id', targetEventId).ilike('rsn', rsn.trim()).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Already signed up with that RSN' }, { status: 409 })

  const { error } = await db.from('bingo_signups').insert({
    event_id: targetEventId, guild_id: GUILD_ID,
    rsn: rsn.trim(),
    discord_username: discord_username?.trim() || null,
    expected_playtime: expected_playtime || null,
    preferred_partner: preferred_partner?.trim() || null,
    notes: notes?.trim() || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await getSupabaseAdmin().from('bingo_signups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
