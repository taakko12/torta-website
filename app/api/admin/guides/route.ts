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
    .select('id, title, created_at, thread_id, forum_channel_id, forum_title')
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

  // Fetch channel name + active/archived threads in parallel
  const [chanRes, activeRes, archivedRes] = await Promise.all([
    fetch(`${DISCORD}/channels/${forum_channel_id}`, { headers }),
    fetch(`${DISCORD}/guilds/${GUILD_ID}/threads/active`, { headers }),
    fetch(`${DISCORD}/channels/${forum_channel_id}/threads/archived/public?limit=100`, { headers }),
  ])

  const chanData = chanRes.ok ? await chanRes.json() : {}
  const forum_title: string | null = (chanData.name as string | undefined) ?? null

  const activeData = activeRes.ok ? await activeRes.json() : { threads: [] }
  const archivedData = archivedRes.ok ? await archivedRes.json() : { threads: [] }

  const threads = [
    ...(activeData.threads ?? []).filter((t: { parent_id: string }) => t.parent_id === forum_channel_id),
    ...(archivedData.threads ?? []),
  ] as { id: string; name: string }[]

  if (threads.length === 0) return NextResponse.json({ imported: 0, message: 'No threads found in that channel.' })

  type Msg = { id: string; content: string; attachments?: { filename: string; url: string; content_type?: string }[] }

  // Collect all messages newest-first via before-pagination, then reverse for chronological order
  async function fetchAllMessages(threadId: string): Promise<string> {
    const all: Msg[] = []
    let before: string | undefined
    while (true) {
      const qs = before ? `?before=${before}&limit=100` : '?limit=100'
      const res = await fetch(`${DISCORD}/channels/${threadId}/messages${qs}`, { headers })
      if (!res.ok) break
      const msgs = await res.json() as Msg[]
      if (!msgs.length) break
      all.push(...msgs)
      if (msgs.length < 100) break
      before = msgs[msgs.length - 1].id
    }
    all.reverse() // oldest → newest

    const segments: string[] = []
    for (const m of all) {
      const parts: string[] = []
      if (m.content.trim()) parts.push(m.content.trim())
      for (const att of m.attachments ?? []) {
        if (att.content_type?.startsWith('image/')) parts.push(`![${att.filename}](${att.url})`)
        else if (att.content_type?.startsWith('video/')) parts.push(`[video](${att.url})`)
      }
      if (parts.length) segments.push(parts.join('\n'))
    }
    return segments.join('\n\n')
  }

  const guides = (await Promise.all(threads.map(async thread => {
    try {
      const content = await fetchAllMessages(thread.id)
      return { title: thread.name, content, thread_id: thread.id, forum_channel_id, forum_title }
    } catch { return null }
  }))).filter(Boolean) as { title: string; content: string; thread_id: string; forum_channel_id: string; forum_title: string | null }[]

  if (guides.length === 0) return NextResponse.json({ imported: 0, message: 'Could not read messages from threads.' })

  const db = getSupabaseAdmin()
  let imported = 0
  for (const g of guides) {
    const { data: existing } = await db.from('raid_guides')
      .select('id').eq('guild_id', GUILD_ID).eq('thread_id', g.thread_id).maybeSingle()
    if (existing) {
      await db.from('raid_guides')
        .update({ title: g.title, content: g.content, forum_title: g.forum_title, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await db.from('raid_guides').insert({ guild_id: GUILD_ID, ...g, updated_at: new Date().toISOString() })
    }
    imported++
  }
  return NextResponse.json({ imported })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await getSupabaseAdmin().from('raid_guides').delete().eq('guild_id', GUILD_ID).eq('id', id)
  return NextResponse.json({ ok: true })
}
