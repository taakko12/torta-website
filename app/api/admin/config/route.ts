import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const ALLOWED = ['planks_channel_id', 'drops_channel_id', 'welcome_channel_id', 'welcome_mod_channel_id', 'clanchat_channel_id', 'broadcast_channel_id', 'inactivity_channel_id', 'recap_channel_id']

async function auth() {
  const session = await getServerSession()
  if (!session) return null
  if (!await isAdmin(session.discordId!)) return null
  return session
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin().from('guild_config').select('*').eq('guild_id', GUILD_ID).maybeSingle()
  return NextResponse.json({ config: data ?? {} })
}

export async function PATCH(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const patch: Record<string, string | null> = { guild_id: GUILD_ID }
  for (const key of ALLOWED) {
    if (key in body) patch[key] = body[key] || null
  }
  await getSupabaseAdmin().from('guild_config').upsert(patch, { onConflict: 'guild_id' })
  return NextResponse.json({ ok: true })
}
