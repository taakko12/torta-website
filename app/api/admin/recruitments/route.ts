import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { data } = await getSupabaseAdmin()
    .from('recruitments')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .order('recruited_at', { ascending: false })
    .limit(200)

  return NextResponse.json({ recruitments: data ?? [] })
}
