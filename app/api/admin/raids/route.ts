import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

async function auth() {
  const session = await getServerSession()
  if (!session) return null
  if (!await isAdmin(session.discordId!)) return null
  return session
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const now = Math.floor(Date.now() / 1000)
  const { data } = await getSupabaseAdmin().from('raids')
    .select('*').eq('guild_id', GUILD_ID).gt('timestamp', now - 86400).order('timestamp')
  return NextResponse.json({ raids: data ?? [] })
}

export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, timestamp, description, channel_id } = await req.json()
  if (!name?.trim() || !timestamp || !channel_id)
    return NextResponse.json({ error: 'name, timestamp, and channel_id required' }, { status: 400 })

  const raidId = `${GUILD_ID}-${timestamp}-${Date.now()}`

  const embed = {
    title: `⚔️ ${name.trim()}`,
    color: 0xe67e22,
    fields: [
      { name: '🕐 Time', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
      ...(description?.trim() ? [{ name: '📋 Details', value: description.trim(), inline: false }] : []),
      { name: '👥 Signups (0)', value: '*No one signed up yet.*', inline: false },
    ],
    footer: { text: `Raid ID: ${raidId}` },
    timestamp: new Date().toISOString(),
  }

  const components = [{
    type: 1,
    components: [
      { type: 2, style: 3, label: 'Sign Up', custom_id: `raid_signup:${raidId}` },
      { type: 2, style: 4, label: 'Drop Out', custom_id: `raid_dropout:${raidId}` },
      { type: 2, style: 2, label: 'Mark Complete', custom_id: `raid_complete:${raidId}` },
    ],
  }]

  const token = process.env.DISCORD_BOT_TOKEN!
  const msgRes = await fetch(`${DISCORD_API}/channels/${channel_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], components }),
  })

  if (!msgRes.ok) {
    const err = await msgRes.json()
    return NextResponse.json({ error: err.message ?? 'Failed to post to Discord' }, { status: 500 })
  }

  const msg = await msgRes.json()

  const { data: raid, error } = await getSupabaseAdmin().from('raids').insert({
    id: raidId,
    guild_id: GUILD_ID,
    name: name.trim(),
    timestamp,
    description: description?.trim() || null,
    channel_id,
    message_id: msg.id,
    signups: [],
    attendees: null,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Failed to save raid' }, { status: 500 })
  return NextResponse.json({ raid })
}
