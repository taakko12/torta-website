import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin()
    .from('tickets')
    .select('*, ticket_messages(count)')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ tickets: data ?? [] })
}
