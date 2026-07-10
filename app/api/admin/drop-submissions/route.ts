import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const s = await getServerSession()
  if (!s || !await isAdmin(s.discordId!)) return null
  return s
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin()
    .from('drop_submissions')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

// PATCH: approve (inserts into drops table) or reject
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await req.json()
  const db = getSupabaseAdmin()
  const { data: sub } = await db.from('drop_submissions').select('*').eq('id', id).eq('guild_id', GUILD_ID).single()
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    await db.from('drops').insert({
      guild_id: GUILD_ID, player_name: sub.rsn, gp_value: sub.gp_value,
      item_name: sub.item_name, screenshot_url: sub.screenshot_url || null,
    })
    logAdminAction(session, 'drop-submissions', 'approve', `${sub.rsn}: ${sub.item_name}`)
  }
  await db.from('drop_submissions').update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: session.discordId }).eq('id', id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await getSupabaseAdmin().from('drop_submissions').delete().eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}
