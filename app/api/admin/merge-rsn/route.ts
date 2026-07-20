import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function POST(req: NextRequest) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { from_rsn, to_rsn } = await req.json()
  if (!from_rsn || !to_rsn) return NextResponse.json({ error: 'from_rsn and to_rsn required' }, { status: 400 })
  if (from_rsn.toLowerCase() === to_rsn.toLowerCase()) return NextResponse.json({ error: 'Cannot merge RSN into itself' }, { status: 400 })

  const db = getSupabaseAdmin()

  const [{ data: fromRow }, { data: toRow }] = await Promise.all([
    db.from('ingame_activity').select('*').eq('guild_id', GUILD_ID).ilike('rsn', from_rsn).maybeSingle(),
    db.from('ingame_activity').select('*').eq('guild_id', GUILD_ID).ilike('rsn', to_rsn).maybeSingle(),
  ])

  if (!fromRow) return NextResponse.json({ error: `No ingame activity found for "${from_rsn}"` }, { status: 404 })

  if (toRow) {
    const latestAt = (!fromRow.last_message_at || (toRow.last_message_at && toRow.last_message_at > fromRow.last_message_at))
      ? toRow.last_message_at
      : fromRow.last_message_at

    await db.from('ingame_activity')
      .update({
        message_count: toRow.message_count + fromRow.message_count,
        month_count: toRow.month_count + fromRow.month_count,
        last_message_at: latestAt,
      })
      .eq('guild_id', GUILD_ID)
      .ilike('rsn', to_rsn)

    await db.from('ingame_activity').delete().eq('guild_id', GUILD_ID).ilike('rsn', from_rsn)
  } else {
    // to_rsn doesn't exist yet — just rename the row
    await db.from('ingame_activity').update({ rsn: to_rsn }).eq('guild_id', GUILD_ID).ilike('rsn', from_rsn)
  }

  logAdminAction(session, 'merge-rsn', null, `${from_rsn} → ${to_rsn}`)
  return NextResponse.json({ ok: true })
}
