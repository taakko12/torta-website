import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT_BASE_URL = process.env.BOT_BASE_URL
const BOT_ADMIN_SECRET = process.env.BOT_ADMIN_SECRET

const VALID_CATEGORIES = ['Events', 'Discord', 'Bot', 'Website', 'Other']

export async function POST(req: Request) {
  const { category, message } = await req.json()
  if (!VALID_CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  if (!message || typeof message !== 'string' || message.trim().length < 3)
    return NextResponse.json({ error: 'Message too short' }, { status: 400 })

  const { error } = await getSupabaseAdmin()
    .from('feedback')
    .insert({ guild_id: GUILD_ID, category, message: message.trim() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (BOT_BASE_URL && BOT_ADMIN_SECRET) {
    fetch(`${BOT_BASE_URL}/api/feedback-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': BOT_ADMIN_SECRET },
      body: JSON.stringify({ guildId: GUILD_ID, category, message: message.trim() }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
