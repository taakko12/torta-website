import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function POST(req: Request) {
  const { rsn, item_name, gp_value, screenshot_url, notes } = await req.json()
  if (!rsn?.trim() || !item_name?.trim() || !gp_value) {
    return NextResponse.json({ error: 'rsn, item_name, and gp_value are required' }, { status: 400 })
  }
  const gp = Number(String(gp_value).replace(/[^0-9]/g, ''))
  if (!gp || gp < 1) return NextResponse.json({ error: 'Invalid gp_value' }, { status: 400 })

  const { error } = await getSupabaseAdmin().from('drop_submissions').insert({
    guild_id: GUILD_ID, rsn: rsn.trim(), item_name: item_name.trim(),
    gp_value: gp, screenshot_url: screenshot_url?.trim() || null, notes: notes?.trim() || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
