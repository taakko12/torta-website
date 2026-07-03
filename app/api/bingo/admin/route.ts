import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function checkAdmin() {
  const session = await getServerSession()
  if (!session?.discordId || !(await isAdmin(session.discordId))) return null
  return session
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  } catch (e) {
    return NextResponse.json({ error: `Auth error: ${(e as Error).message}` }, { status: 500 })
  }
  const db = getSupabaseAdmin()
  const body = await req.json()
  const { action } = body

  if (action === 'create_event') {
    const { title, board_size } = body
    const { data, error } = await db
      .from('bingo_events')
      .insert({ guild_id: GUILD_ID, title, board_size: board_size ?? 5, active: false })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'set_active') {
    const { event_id } = body
    await db.from('bingo_events').update({ active: false }).eq('guild_id', GUILD_ID)
    if (event_id) await db.from('bingo_events').update({ active: true }).eq('id', event_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'upsert_task') {
    const { id, event_id, position, title, description, image_url, points, required_count } = body
    const payload = { event_id, position, title, description: description || null, image_url: image_url || null, points, required_count }
    let error
    if (id) {
      ;({ error } = await db.from('bingo_tasks').update(payload).eq('id', id))
    } else {
      ;({ error } = await db.from('bingo_tasks').insert(payload))
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_task') {
    const { id } = body
    const { error } = await db.from('bingo_tasks').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'create_team') {
    const { event_id, name, color } = body
    const { data, error } = await db
      .from('bingo_teams')
      .insert({ event_id, name, color: color || '#c89b3c' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'delete_team') {
    const { id } = body
    const { error } = await db.from('bingo_teams').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'add_member') {
    const { team_id, rsn } = body
    const { error } = await db.from('bingo_team_members').insert({ team_id, rsn: rsn.trim() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_member') {
    const { id } = body
    const { error } = await db.from('bingo_team_members').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
