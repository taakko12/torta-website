import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT_BASE_URL = process.env.BOT_BASE_URL
const BOT_ADMIN_SECRET = process.env.BOT_ADMIN_SECRET

export async function POST(req: Request) {
  const { dropId, label, reason } = await req.json()
  if (!dropId || !label || !reason?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await getSupabaseAdmin()
    .from('drops')
    .update({ flagged: true, flag_reason: reason.trim() })
    .eq('id', dropId)
    .eq('guild_id', GUILD_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (BOT_BASE_URL && BOT_ADMIN_SECRET) {
    fetch(`${BOT_BASE_URL}/api/loot-review-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': BOT_ADMIN_SECRET },
      body: JSON.stringify({ guildId: GUILD_ID, label, reason: reason.trim() }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
