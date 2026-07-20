import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('rsvps')

  const supabase = getSupabaseAdmin()

  if (eventId) {
    const { data } = await supabase.from('event_rsvps').select('discord_id, display_name, rsvped_at, attended').eq('event_id', eventId).order('rsvped_at')
    return NextResponse.json({ rsvps: data ?? [] })
  }

  const { data } = await supabase.from('clan_events').select('*, event_rsvps(count)').eq('guild_id', GUILD_ID).order('scheduled_at', { ascending: true, nullsFirst: false })
  return NextResponse.json({ events: data ?? [] })
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { title, description, event_type, scheduled_at, channel_id } = await req.json()
  if (!title?.trim() || !channel_id) return NextResponse.json({ error: 'title and channel_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: event, error } = await supabase.from('clan_events').insert({
    guild_id: GUILD_ID, title: title.trim(), description: description?.trim() || null,
    event_type: event_type || 'Event', scheduled_at: scheduled_at || null,
    channel_id, created_by_discord_id: session.discordId,
  }).select().single()

  if (error || !event) return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  logAdminAction(session, 'events', 'create', title.trim())

  // Post embed to Discord with RSVP buttons
  const token = process.env.DISCORD_BOT_TOKEN
  if (token) {
    const dateStr = scheduled_at
      ? new Date(scheduled_at).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
      : 'TBD'
    const res = await fetch(`${DISCORD_API}/channels/${channel_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{ title: `📅 ${title}`, description: description?.trim() || undefined, color: 0x7c5ce8, fields: [{ name: 'When', value: dateStr, inline: true }, { name: 'Type', value: event_type || 'Event', inline: true }], footer: { text: 'Click below to RSVP' } }],
        components: [{ type: 1, components: [{ type: 2, style: 3, label: '✅ Going', custom_id: `rsvp:${event.id}:going` }, { type: 2, style: 4, label: "❌ Can't make it", custom_id: `rsvp:${event.id}:no` }] }],
      }),
    })
    if (res.ok) {
      const msg = await res.json()
      await supabase.from('clan_events').update({ message_id: msg.id }).eq('id', event.id)
    }
  }

  return NextResponse.json({ event })
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { event_id, discord_id, attended } = await req.json()
  await getSupabaseAdmin().from('event_rsvps').update({ attended }).eq('event_id', event_id).eq('discord_id', discord_id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id, title } = await req.json()
  await getSupabaseAdmin().from('clan_events').delete().eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'events', 'delete', title ?? id)
  return NextResponse.json({ ok: true })
}
