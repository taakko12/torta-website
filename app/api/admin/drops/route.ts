import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await getSupabaseAdmin().from('drops').delete().eq('id', id).eq('guild_id', GUILD_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  logAdminAction(session, 'drops', 'delete', `id ${id}`)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id, gp_value, clear_flag } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  if (clear_flag) {
    const { error } = await getSupabaseAdmin().from('drops').update({ flagged: false, flag_reason: null }).eq('id', id).eq('guild_id', GUILD_ID)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    logAdminAction(session, 'drops', 'clear-flag', `id ${id}`)
    return NextResponse.json({ ok: true })
  }

  if (gp_value == null) return NextResponse.json({ error: 'gp_value required' }, { status: 400 })
  const gp = Number(gp_value)
  if (!Number.isFinite(gp) || gp < 1) return NextResponse.json({ error: 'Invalid gp_value' }, { status: 400 })
  const { error } = await getSupabaseAdmin().from('drops').update({ gp_value: gp }).eq('id', id).eq('guild_id', GUILD_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  logAdminAction(session, 'drops', 'edit-gp', `id ${id} → ${gp.toLocaleString()} gp`)
  return NextResponse.json({ ok: true })
}
