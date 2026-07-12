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

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, gp_value } = await req.json()
  if (!id || gp_value == null) return NextResponse.json({ error: 'id and gp_value required' }, { status: 400 })
  const gp = Number(gp_value)
  if (!Number.isFinite(gp) || gp < 1) return NextResponse.json({ error: 'Invalid gp_value' }, { status: 400 })
  const { error } = await getSupabaseAdmin().from('drops').update({ gp_value: gp }).eq('id', id).eq('guild_id', GUILD_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  logAdminAction(session, 'drops', 'edit-gp', `id ${id} → ${gp.toLocaleString()} gp`)
  return NextResponse.json({ ok: true })
}
