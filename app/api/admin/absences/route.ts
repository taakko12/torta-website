import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await getSupabaseAdmin()
    .from('absences')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .is('returned_at', null)
    .order('created_at', { ascending: false })
  return NextResponse.json({ absences: data ?? [] })
}
