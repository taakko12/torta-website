import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const HISTORY_SIZE = 5

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const type = new URL(req.url).searchParams.get('type')
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })
  const { data } = await getSupabaseAdmin()
    .from('comp_picks')
    .select('id, metric, picked_at')
    .eq('guild_id', GUILD_ID)
    .eq('poll_type', type)
    .order('picked_at', { ascending: false })
    .limit(15)
  const picks = data ?? []
  const excluded = picks.slice(0, HISTORY_SIZE).map(p => p.metric)
  return NextResponse.json({ picks, excluded })
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { poll_type, metric } = await req.json()
  if (!poll_type || !metric) return NextResponse.json({ error: 'poll_type and metric required' }, { status: 400 })
  const { error } = await getSupabaseAdmin().from('comp_picks').insert({ guild_id: GUILD_ID, poll_type, metric: metric.trim().toLowerCase() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  await getSupabaseAdmin().from('comp_picks').delete().eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}
