import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

// POST: set winner for given month
export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { winner_name, note, month } = await req.json()
  if (!winner_name?.trim() || !month) return NextResponse.json({ error: 'winner_name and month required' }, { status: 400 })
  const db = getSupabaseAdmin()
  await db.from('cotm_winners').delete().eq('guild_id', GUILD_ID).eq('month', month)
  const { data, error } = await db.from('cotm_winners')
    .insert({ guild_id: GUILD_ID, winner_name: winner_name.trim(), note: note?.trim() || null, month })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { month } = await req.json()
  await getSupabaseAdmin().from('cotm_winners').delete().eq('guild_id', GUILD_ID).eq('month', month)
  return NextResponse.json({ ok: true })
}
