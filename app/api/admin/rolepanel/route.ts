import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

type PanelRole = { roleId: string; emoji: string; label: string }
type Panel = { channelId: string | null; messageId: string | null; roles: PanelRole[] }

const DEFAULT_PANEL: Panel = { channelId: null, messageId: null, roles: [] }

async function auth() {
  const session = await getServerSession()
  if (!session) return null
  if (!await isAdmin(session.discordId!)) return null
  return session
}

function buildPanelBody(roles: PanelRole[]) {
  const desc = roles.length === 0
    ? 'No roles added yet.'
    : roles.map(r => `${r.emoji}  <@&${r.roleId}>`).join('\n') + '\n\n**Click a button below to toggle a role.**'

  const components = []
  for (let i = 0; i < roles.length; i += 5) {
    components.push({
      type: 1,
      components: roles.slice(i, i + 5).map(r => ({
        type: 2, style: 2, label: r.label,
        emoji: { name: r.emoji },
        custom_id: `rolepanel:${r.roleId}`,
      })),
    })
  }

  return {
    embeds: [{ title: '🎭 Role Selection', description: desc, color: 0x5865f2, timestamp: new Date().toISOString() }],
    components,
  }
}

async function syncPanelMessage(panel: Panel, token: string): Promise<string | null> {
  if (!panel.channelId) return null
  const body = buildPanelBody(panel.roles)

  if (panel.messageId) {
    const res = await fetch(`${DISCORD_API}/channels/${panel.channelId}/messages/${panel.messageId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return panel.messageId
  }

  // Post new if edit fails or no existing message
  const res = await fetch(`${DISCORD_API}/channels/${panel.channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const msg = await res.json()
  return msg.id
}

async function savePanel(panel: Panel) {
  await getSupabaseAdmin().from('guild_config').upsert(
    { guild_id: GUILD_ID, role_panel_config: panel },
    { onConflict: 'guild_id' }
  )
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin().from('guild_config')
    .select('role_panel_config').eq('guild_id', GUILD_ID).maybeSingle()
  return NextResponse.json({ panel: data?.role_panel_config ?? DEFAULT_PANEL })
}

// Add a role to the panel
export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { roleId, emoji, label } = await req.json()
  if (!roleId || !emoji) return NextResponse.json({ error: 'roleId and emoji required' }, { status: 400 })

  const { data } = await getSupabaseAdmin().from('guild_config')
    .select('role_panel_config').eq('guild_id', GUILD_ID).maybeSingle()
  const panel: Panel = data?.role_panel_config ?? DEFAULT_PANEL

  if (panel.roles.some(r => r.roleId === roleId))
    return NextResponse.json({ error: 'Role already on panel' }, { status: 409 })
  if (panel.roles.length >= 25)
    return NextResponse.json({ error: 'Maximum 25 roles per panel' }, { status: 400 })

  panel.roles.push({ roleId, emoji, label: label || emoji })

  const token = process.env.DISCORD_BOT_TOKEN!
  const newMsgId = await syncPanelMessage(panel, token)
  if (newMsgId) panel.messageId = newMsgId

  await savePanel(panel)
  return NextResponse.json({ panel })
}

// Remove a role from the panel
export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { roleId } = await req.json()

  const { data } = await getSupabaseAdmin().from('guild_config')
    .select('role_panel_config').eq('guild_id', GUILD_ID).maybeSingle()
  const panel: Panel = data?.role_panel_config ?? DEFAULT_PANEL

  panel.roles = panel.roles.filter(r => r.roleId !== roleId)

  const token = process.env.DISCORD_BOT_TOKEN!
  const newMsgId = await syncPanelMessage(panel, token)
  if (newMsgId) panel.messageId = newMsgId

  await savePanel(panel)
  return NextResponse.json({ panel })
}

// Post/repost the panel to a channel
export async function PATCH(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { channelId } = await req.json()
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

  const { data } = await getSupabaseAdmin().from('guild_config')
    .select('role_panel_config').eq('guild_id', GUILD_ID).maybeSingle()
  const panel: Panel = { ...(data?.role_panel_config ?? DEFAULT_PANEL), channelId, messageId: null }

  const token = process.env.DISCORD_BOT_TOKEN!
  const msgId = await syncPanelMessage(panel, token)
  if (!msgId) return NextResponse.json({ error: 'Failed to post panel to Discord' }, { status: 500 })
  panel.messageId = msgId

  await savePanel(panel)
  return NextResponse.json({ panel })
}
