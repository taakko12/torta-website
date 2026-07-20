import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

async function dmUser(discordId: string, content: string) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return
  // Open DM channel, then send
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: discordId }),
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
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { data } = await getSupabaseAdmin()
    .from('drop_submissions')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

// PATCH: approve (inserts into drops table) or reject
export async function PATCH(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id, action } = await req.json()
  const db = getSupabaseAdmin()
  const { data: sub } = await db.from('drop_submissions').select('*').eq('id', id).eq('guild_id', GUILD_ID).single()
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    await db.from('drops').insert({
      guild_id: GUILD_ID, player_name: sub.rsn, gp_value: sub.gp_value,
      item_name: sub.item_name, screenshot_url: sub.screenshot_url || null,
    })
    logAdminAction(session, 'drop-submissions', 'approve', `${sub.rsn}: ${sub.item_name}`)
  }
  await db.from('drop_submissions').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: session.discordId,
  }).eq('id', id)

  // DM the submitter if we can find their discord_id via rsn_links
  const { data: link } = await db.from('rsn_links').select('discord_id').eq('guild_id', GUILD_ID).ilike('rsn', sub.rsn).maybeSingle()
  if (link?.discord_id) {
    const msg = action === 'approve'
      ? `✅ Your drop submission for **${sub.item_name}** has been approved and added to the leaderboard!`
      : `❌ Your drop submission for **${sub.item_name}** was not approved. Reach out to a mod if you have questions.`
    await dmUser(link.discord_id, msg)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await req.json()
  await getSupabaseAdmin().from('drop_submissions').delete().eq('id', id).eq('guild_id', GUILD_ID)
  return NextResponse.json({ ok: true })
}
