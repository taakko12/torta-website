import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

async function botDm(userId: string, content: string) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: userId }),
  })
  if (!dmRes.ok) return
  const { id: channelId } = await dmRes.json()
  await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  }).catch(() => null)
}

export async function POST(req: Request) {
  const { rsn, discord_username, discord_user_id, timezone, about, why } = await req.json()
  if (!rsn?.trim() || !about?.trim() || !why?.trim()) {
    return NextResponse.json({ error: 'rsn, about, and why are required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { error } = await db.from('applications').insert({
    guild_id: GUILD_ID,
    rsn: rsn.trim(),
    discord_username: discord_username?.trim() || null,
    discord_user_id: discord_user_id?.trim() || null,
    timezone: timezone?.trim() || null,
    about: about.trim(),
    why: why.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const token = process.env.DISCORD_BOT_TOKEN
  if (token) {
    // DM the applicant if they provided their user ID
    if (discord_user_id?.trim()) {
      await botDm(
        discord_user_id.trim(),
        `👋 Hey! We received your application to **Torta** — thanks for applying!\n\nA staff member will review it and get back to you soon. In the meantime, sit tight!`
      )
    }

    // Ping mod channel
    const { data: cfg } = await db.from('guild_config').select('welcome_mod_channel_id').eq('guild_id', GUILD_ID).maybeSingle()
    const modChannelId = cfg?.welcome_mod_channel_id
    if (modChannelId) {
      const who = discord_username?.trim()
        ? `${rsn.trim()} (@${discord_username.trim()})`
        : rsn.trim()
      await fetch(`${DISCORD_API}/channels/${modChannelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `📋 **New application from ${who}**${discord_user_id?.trim() ? ` (ID: ${discord_user_id.trim()})` : ''}\nReview at https://tortapounders.vercel.app/admin/applications`,
        }),
      }).catch(() => null)
    }
  }

  return NextResponse.json({ ok: true })
}
