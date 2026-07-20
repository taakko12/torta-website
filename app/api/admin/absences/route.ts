import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { data } = await getSupabaseAdmin()
    .from('absences')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .is('returned_at', null)
    .order('created_at', { ascending: false })
  return NextResponse.json({ absences: data ?? [] })
}
