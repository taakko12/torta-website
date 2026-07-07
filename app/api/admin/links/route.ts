import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const session = await getServerSession()
  if (!session) return null
  if (!await isAdmin(session.discordId!)) return null
  return session
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdmin()
  const [{ data: links }, { data: activity }] = await Promise.all([
    db.from('rsn_links').select('discord_id, rsn, linked_at, primary_rsn').eq('guild_id', GUILD_ID).order('primary_rsn', { ascending: false }).order('linked_at', { ascending: false }),
    db.from('discord_activity').select('discord_id, display_name').eq('guild_id', GUILD_ID),
  ])
  const nameMap = Object.fromEntries((activity ?? []).filter(a => a.display_name).map(a => [a.discord_id, a.display_name]))
  return NextResponse.json({
    links: (links ?? []).map(l => ({ ...l, display_name: nameMap[l.discord_id] ?? null })),
  })
}

export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discord_id, rsn } = await req.json()
  if (!discord_id?.trim() || !rsn?.trim()) return NextResponse.json({ error: 'discord_id and rsn required' }, { status: 400 })

  const db = getSupabaseAdmin()

  // Check if user already has any RSNs — if not, this one is primary
  const { data: existing } = await db.from('rsn_links').select('rsn').eq('guild_id', GUILD_ID).eq('discord_id', discord_id.trim()).limit(1)
  const primary_rsn = !existing || existing.length === 0

  const { error } = await db.from('rsn_links').upsert(
    { discord_id: discord_id.trim(), guild_id: GUILD_ID, rsn: rsn.trim().toLowerCase(), linked_at: new Date().toISOString(), primary_rsn },
    { onConflict: 'discord_id,guild_id,rsn' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, primary_rsn })
}

// Set a specific RSN as primary for a Discord user
export async function PATCH(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discord_id, rsn } = await req.json()
  if (!discord_id || !rsn) return NextResponse.json({ error: 'discord_id and rsn required' }, { status: 400 })

  const db = getSupabaseAdmin()
  await db.from('rsn_links').update({ primary_rsn: false }).eq('guild_id', GUILD_ID).eq('discord_id', discord_id)
  await db.from('rsn_links').update({ primary_rsn: true }).eq('guild_id', GUILD_ID).eq('discord_id', discord_id).eq('rsn', rsn)
  return NextResponse.json({ ok: true })
}

// Delete a specific RSN link; if it was primary, auto-promote the next one
export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { discord_id, rsn } = await req.json()
  if (!discord_id) return NextResponse.json({ error: 'discord_id required' }, { status: 400 })

  const db = getSupabaseAdmin()

  if (rsn) {
    // Delete specific RSN
    const { data: deleted } = await db.from('rsn_links').delete().eq('guild_id', GUILD_ID).eq('discord_id', discord_id).eq('rsn', rsn).select('primary_rsn')
    // If we deleted the primary, promote whichever RSN remains first
    if (deleted?.[0]?.primary_rsn) {
      const { data: remaining } = await db.from('rsn_links').select('rsn').eq('guild_id', GUILD_ID).eq('discord_id', discord_id).limit(1)
      if (remaining?.[0]) {
        await db.from('rsn_links').update({ primary_rsn: true }).eq('guild_id', GUILD_ID).eq('discord_id', discord_id).eq('rsn', remaining[0].rsn)
      }
    }
  } else {
    // Delete all RSNs for this user
    await db.from('rsn_links').delete().eq('guild_id', GUILD_ID).eq('discord_id', discord_id)
  }

  return NextResponse.json({ ok: true })
}
