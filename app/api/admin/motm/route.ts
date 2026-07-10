import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const s = await getServerSession()
  if (!s || !await isAdmin(s.discordId!)) return null
  return s
}

// POST: set winner for given month
export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { winner_name, note, month } = await req.json()
  if (!winner_name?.trim() || !month) return NextResponse.json({ error: 'winner_name and month required' }, { status: 400 })
  const db = getSupabaseAdmin()
  await db.from('motm_winners').delete().eq('guild_id', GUILD_ID).eq('month', month)
  const { data, error } = await db.from('motm_winners')
    .insert({ guild_id: GUILD_ID, winner_name: winner_name.trim(), note: note?.trim() || null, month })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { month } = await req.json()
  await getSupabaseAdmin().from('motm_winners').delete().eq('guild_id', GUILD_ID).eq('month', month)
  return NextResponse.json({ ok: true })
}
