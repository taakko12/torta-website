import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

export async function GET() {
  const { data } = await getSupabaseAdmin().from('guild_config').select('rules_content').eq('guild_id', GUILD_ID).maybeSingle()
  return NextResponse.json({ content: data?.rules_content ?? '' })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { content } = await req.json()
  await getSupabaseAdmin().from('guild_config').upsert({ guild_id: GUILD_ID, rules_content: content ?? '' }, { onConflict: 'guild_id' })
  logAdminAction(session, 'rules', 'update')
  return NextResponse.json({ ok: true })
}
