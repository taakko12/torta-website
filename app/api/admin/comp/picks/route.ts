import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const HISTORY_SIZE = 5

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

export async function GET(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { poll_type, metric } = await req.json()
  if (!poll_type || !metric) return NextResponse.json({ error: 'poll_type and metric required' }, { status: 400 })
  await getSupabaseAdmin().from('comp_picks').insert({ guild_id: GUILD_ID, poll_type, metric: metric.trim().toLowerCase() })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await getSupabaseAdmin().from('comp_picks').delete().eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}
