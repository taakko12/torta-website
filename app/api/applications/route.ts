import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function POST(req: Request) {
  const { rsn, discord_username, timezone, about, why } = await req.json()
  if (!rsn?.trim() || !about?.trim() || !why?.trim()) {
    return NextResponse.json({ error: 'rsn, about, and why are required' }, { status: 400 })
  }
  const db = getSupabaseAdmin()
  const { error } = await db.from('applications').insert({
    guild_id: GUILD_ID,
    rsn: rsn.trim(),
    discord_username: discord_username?.trim() || null,
    timezone: timezone?.trim() || null,
    about: about.trim(),
    why: why.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify in Discord if configured
  const notifyChannelId = process.env.APPLICATIONS_CHANNEL_ID
  const token = process.env.DISCORD_BOT_TOKEN
  if (notifyChannelId && token) {
    await fetch(`https://discord.com/api/v10/channels/${notifyChannelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `📋 **New application** from **${rsn.trim()}** (Discord: ${discord_username?.trim() || 'not provided'})\nReview at https://tortapounders.vercel.app/admin/applications` }),
    }).catch(() => null)
  }

  return NextResponse.json({ ok: true })
}
