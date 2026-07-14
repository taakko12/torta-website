import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const ALLOWED_STR  = ['planks_channel_id', 'drops_channel_id', 'lootsubmit_channel_id', 'welcome_channel_id', 'welcome_mod_channel_id', 'welcome_role_id', 'clanchat_channel_id', 'broadcast_channel_id', 'coffer_channel_id', 'coffer_leaderboard_channel_id', 'inactivity_channel_id', 'recap_channel_id', 'changelog_channel_id', 'rules_content', 'owner_role_name', 'comp_sotw_days', 'comp_botw_days']
const ALLOWED_ARR  = ['staff_role_names', 'recap_excluded_roles']
const ALLOWED_NUM  = ['comp_poll_day', 'comp_poll_hour']
const ALLOWED_BOOL = ['feedback_enabled', 'clanchat_tracking_enabled', 'vc_tracking_enabled']

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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const patch: Record<string, unknown> = { guild_id: GUILD_ID }
  const changed: string[] = []
  for (const key of ALLOWED_STR) {
    if (key in body) { patch[key] = body[key] || null; changed.push(key) }
  }
  for (const key of ALLOWED_ARR) {
    if (key in body) { patch[key] = Array.isArray(body[key]) ? body[key] : null; changed.push(key) }
  }
  for (const key of ALLOWED_NUM) {
    if (key in body && body[key] != null) { patch[key] = Number(body[key]); changed.push(key) }
  }
  for (const key of ALLOWED_BOOL) {
    if (key in body) { patch[key] = Boolean(body[key]); changed.push(key) }
  }
  await getSupabaseAdmin().from('guild_config').upsert(patch, { onConflict: 'guild_id' })
  logAdminAction(session, 'config', 'update', changed.join(', '))
  return NextResponse.json({ ok: true })
}
