import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD = 'https://discord.com/api/v10'

async function auth() {
  const session = await getServerSession()
  if (!session) return null
  if (!await isAdmin(session.discordId!)) return null
  return session
}

function botHeaders() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!}`, 'Content-Type': 'application/json' }
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await getSupabaseAdmin()
    .from('raid_guides')
    .select('id, title, created_at, thread_id, forum_channel_id')
    .eq('guild_id', GUILD_ID)
    .order('title', { ascending: true })
  return NextResponse.json({ guides: data ?? [] })
}

// POST { forum_channel_id } — import threads from a Discord forum channel
export async function POST(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { forum_channel_id } = await req.json()
  if (!forum_channel_id) return NextResponse.json({ error: 'forum_channel_id required' }, { status: 400 })

  const headers = botHeaders()

  // Fetch active threads (filtered by parent) + archived threads from the forum
  const [activeRes, archivedRes] = await Promise.all([
    fetch(`${DISCORD}/guilds/${GUILD_ID}/threads/active`, { headers }),
    fetch(`${DISCORD}/channels/${forum_channel_id}/threads/archived/public?limit=100`, { headers }),
  ])

  const activeData = activeRes.ok ? await activeRes.json() : { threads: [] }
  const archivedData = archivedRes.ok ? await archivedRes.json() : { threads: [] }

  const threads = [
    ...(activeData.threads ?? []).filter((t: { parent_id: string }) => t.parent_id === forum_channel_id),
    ...(archivedData.threads ?? []),
  ] as { id: string; name: string }[]

  if (threads.length === 0) return NextResponse.json({ imported: 0, message: 'No threads found in that channel.' })

  // Fetch starter message from each thread (oldest message = after snowflake 1)
  const guides = (await Promise.all(threads.map(async thread => {
    try {
      const msgRes = await fetch(`${DISCORD}/channels/${thread.id}/messages?after=1&limit=1`, { headers })
      if (!msgRes.ok) return null
      const messages = await msgRes.json()
      const content: string = messages[0]?.content ?? ''
      return { title: thread.name, content, thread_id: thread.id, forum_channel_id }
    } catch { return null }
  }))).filter(Boolean) as { title: string; content: string; thread_id: string; forum_channel_id: string }[]

  if (guides.length === 0) return NextResponse.json({ imported: 0, message: 'Could not read messages from threads.' })

  const db = getSupabaseAdmin()
  const { error } = await db.from('raid_guides').upsert(
    guides.map(g => ({ guild_id: GUILD_ID, ...g, updated_at: new Date().toISOString() })),
    { onConflict: 'guild_id,thread_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: guides.length })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await getSupabaseAdmin().from('raid_guides').delete().eq('guild_id', GUILD_ID).eq('id', id)
  return NextResponse.json({ ok: true })
}
