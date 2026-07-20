import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT = process.env.DISCORD_BOT_TOKEN!
const DISCORD = 'https://discord.com/api/v10'
const GUEST_ROLE_ID = process.env.GUEST_ROLE_ID || '1519867633069981818'

async function swapRole(userId: string, fromRoleId: string | null, toRoleId: string): Promise<boolean> {
  const headers = { Authorization: `Bot ${BOT}` }
  const base = `${DISCORD}/guilds/${GUILD_ID}/members/${userId}/roles`
  const [addRes] = await Promise.all([
    fetch(`${base}/${toRoleId}`, { method: 'PUT', headers }),
    fromRoleId ? fetch(`${base}/${fromRoleId}`, { method: 'DELETE', headers }) : Promise.resolve(null),
    fetch(`${base}/${GUEST_ROLE_ID}`, { method: 'DELETE', headers }), // always strip Guest on promotion
  ])
  return addRes.ok
}

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { data } = await getSupabaseAdmin().from('promotions').select('*').eq('guild_id', GUILD_ID).order('promoted_at', { ascending: false }).limit(200)
  return NextResponse.json({ promotions: data ?? [] })
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { discord_id, display_name, rsn, from_role, to_role, from_role_id, to_role_id, notes } = await req.json()
  if (!to_role?.trim()) return NextResponse.json({ error: 'to_role required' }, { status: 400 })

  let roleSwapped = false
  if (discord_id && to_role_id) {
    roleSwapped = await swapRole(discord_id, from_role_id ?? null, to_role_id)
  }

  const { data, error } = await getSupabaseAdmin().from('promotions').insert({
    guild_id: GUILD_ID,
    discord_id: discord_id ?? null,
    display_name: display_name ?? null,
    rsn: rsn?.toLowerCase() ?? null,
    from_role: from_role ?? null,
    to_role: to_role.trim(),
    notes: notes ?? null,
    promoted_by_name: session.user?.name ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  logAdminAction(session, 'promotions', 'add', `${display_name ?? rsn ?? discord_id}: ${from_role ?? '?'} → ${to_role}`)
  return NextResponse.json({ promotion: data, roleSwapped })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  await getSupabaseAdmin().from('promotions').delete().eq('id', id).eq('guild_id', GUILD_ID)
  logAdminAction(session, 'promotions', 'delete', String(id))
  return NextResponse.json({ ok: true })
}
