import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL
const ADMIN_URL = 'https://tortapounders.vercel.app/admin/feedback'

const CATEGORY_COLORS: Record<string, number> = {
  Events:  0x5865F2,
  Discord: 0x57F287,
  Bot:     0xFEE75C,
  Website: 0xEB459E,
}

const VALID_CATEGORIES = ['Events', 'Discord', 'Bot', 'Website']

export async function POST(req: Request) {
  const { category, message } = await req.json()
  if (!VALID_CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  if (!message || typeof message !== 'string' || message.trim().length < 3)
    return NextResponse.json({ error: 'Message too short' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('feedback')
    .insert({ guild_id: GUILD_ID, category, message: message.trim() })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (WEBHOOK_URL) {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '📬 New Feedback',
          color: CATEGORY_COLORS[category] ?? 0x7c5ce8,
          fields: [
            { name: 'Category', value: category, inline: true },
            { name: 'Message', value: message.trim() },
          ],
          footer: { text: `View in admin panel → ${ADMIN_URL}` },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, id: data.id })
}
