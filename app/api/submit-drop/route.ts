import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

function gpFormat(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export async function POST(req: Request) {
  const { rsn, item_name, gp_value, screenshot_url, notes } = await req.json()
  if (!rsn?.trim() || !item_name?.trim() || !gp_value) {
    return NextResponse.json({ error: 'rsn, item_name, and gp_value are required' }, { status: 400 })
  }
  const gp = Number(String(gp_value).replace(/[^0-9]/g, ''))
  if (!gp || gp < 1) return NextResponse.json({ error: 'Invalid gp_value' }, { status: 400 })

  const db = getSupabaseAdmin()
  const { error } = await db.from('drop_submissions').insert({
    guild_id: GUILD_ID, rsn: rsn.trim(), item_name: item_name.trim(),
    gp_value: gp, screenshot_url: screenshot_url?.trim() || null, notes: notes?.trim() || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ping mod-approvals channel
  const token = process.env.DISCORD_BOT_TOKEN
  if (token) {
    const { data: cfg } = await db.from('guild_config').select('welcome_mod_channel_id').eq('guild_id', GUILD_ID).maybeSingle()
    const modChannelId = cfg?.welcome_mod_channel_id
    if (modChannelId) {
      const lines = [
        `📦 **Drop submission pending review**`,
        `**${rsn.trim()}** — ${item_name.trim()} (${gpFormat(gp)})`,
        notes?.trim() ? `> ${notes.trim()}` : null,
        screenshot_url?.trim() ? screenshot_url.trim() : null,
        `Review at https://tortapounders.vercel.app/admin/loot`,
      ].filter(Boolean).join('\n')
      await fetch(`${DISCORD_API}/channels/${modChannelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: lines }),
      }).catch(() => null)
    }
  }

  return NextResponse.json({ ok: true })
}
