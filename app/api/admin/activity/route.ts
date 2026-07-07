import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = getSupabaseAdmin()
  const [{ data: discord }, { data: ingame }] = await Promise.all([
    supabase.from('discord_activity').select('discord_id, display_name, role_name, message_count, last_message_at').order('message_count', { ascending: false }).limit(200),
    supabase.from('ingame_activity').select('rsn, message_count, last_message_at').order('message_count', { ascending: false }).limit(200),
  ])

  return NextResponse.json({ discord: discord ?? [], ingame: ingame ?? [] })
}
