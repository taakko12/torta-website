import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { data } = await getSupabaseAdmin()
    .from('command_logs')
    .select('id, discord_id, display_name, command, subcommand, channel_id, logged_at')
    .eq('guild_id', GUILD_ID)
    .order('logged_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ logs: data ?? [] })
}
