import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/logAction'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT = process.env.DISCORD_BOT_TOKEN!
const DISCORD = 'https://discord.com/api/v10'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const { data: ticket } = await getSupabaseAdmin()
    .from('tickets').select('discord_id').eq('id', id).eq('guild_id', GUILD_ID).single()
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  // Open DM channel and send message
  const dmRes = await fetch(`${DISCORD}/users/@me/channels`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: ticket.discord_id }),
  })
  if (!dmRes.ok) return NextResponse.json({ error: 'Could not open DM channel' }, { status: 500 })
  const dm = await dmRes.json() as { id: string }

  const msgRes = await fetch(`${DISCORD}/channels/${dm.id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.trim() }),
  })
  if (!msgRes.ok) return NextResponse.json({ error: 'Failed to send DM' }, { status: 500 })

  const { data: message } = await getSupabaseAdmin().from('ticket_messages').insert({
    ticket_id: Number(id),
    author_discord_id: session.discordId!,
    author_name: session.user?.name ?? null,
    content: content.trim(),
    direction: 'outbound',
  }).select().single()

  logAdminAction(session, 'ticket', 'reply', `#${id}`)
  return NextResponse.json({ message })
}
