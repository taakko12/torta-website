import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function PATCH(req: Request) {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { discord_id, rsn } = await req.json()
  if (!discord_id) return NextResponse.json({ error: 'discord_id required' }, { status: 400 })

  await getSupabaseAdmin().from('wom_left_alerts').update({ resolved_at: new Date().toISOString() })
    .eq('guild_id', GUILD_ID).eq('discord_id', discord_id).is('resolved_at', null)

  logAdminAction(session, 'wom-departures', 'resolve', rsn ?? discord_id)
  return NextResponse.json({ ok: true })
}
