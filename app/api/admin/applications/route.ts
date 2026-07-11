import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

async function auth() {
  const s = await getServerSession()
  if (!s || !await isAdmin(s.discordId!)) return null
  return s
}

async function botDm(userId: string, content: string) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: userId }),
  })
  if (!dmRes.ok) return
  const { id: channelId } = await dmRes.json()
  await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  }).catch(() => null)
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin()
    .from('applications')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status, notes } = await req.json()
  const db = getSupabaseAdmin()

  const update: Record<string, unknown> = { status }
  if (notes !== undefined) update.notes = notes
  if (status !== 'pending') { update.reviewed_at = new Date().toISOString(); update.reviewed_by = session.discordId }
  await db.from('applications').update(update).eq('id', id).eq('guild_id', GUILD_ID)

  // DM applicant on acceptance or rejection if we have their user ID
  const { data: app, error: appErr } = await db.from('applications').select('discord_user_id, rsn').eq('id', id).maybeSingle()
  const dmLog: Record<string, unknown> = { discord_user_id: app?.discord_user_id ?? null, app_fetch_error: appErr?.message ?? null }

  if (app?.discord_user_id) {
    const token = process.env.DISCORD_BOT_TOKEN
    dmLog.has_token = !!token
    if (token) {
      if (status === 'accepted') {
        const { data: cfg } = await db.from('guild_config').select('welcome_channel_id').eq('guild_id', GUILD_ID).maybeSingle()
        dmLog.welcome_channel_id = cfg?.welcome_channel_id ?? null
        let inviteUrl: string | null = null
        if (cfg?.welcome_channel_id) {
          const invRes = await fetch(`${DISCORD_API}/channels/${cfg.welcome_channel_id}/invites`, {
            method: 'POST',
            headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ max_uses: 1, max_age: 86400, unique: true }),
          })
          dmLog.invite_status = invRes.status
          if (invRes.ok) {
            const inv = await invRes.json()
            inviteUrl = `https://discord.gg/${inv.code}`
            dmLog.invite_url = inviteUrl
          } else {
            dmLog.invite_error = await invRes.text()
          }
        }
        await botDm(
          app.discord_user_id,
          inviteUrl
            ? `🎉 Your application to **Torta** has been accepted! Welcome to the clan!\n\nHere's your invite link (single-use, expires in 24h):\n${inviteUrl}`
            : `🎉 Your application to **Torta** has been accepted! Welcome to the clan! A staff member will send you a server invite shortly.`
        )
      } else if (status === 'rejected') {
        await botDm(
          app.discord_user_id,
          `Thanks for applying to **Torta**. After review, we're unable to accept your application at this time. Feel free to apply again in the future!`
        )
      }
    }
  }

  return NextResponse.json({ ok: true, _dm: dmLog })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await getSupabaseAdmin().from('applications').delete().eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}
