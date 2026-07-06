import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'

const DISCORD_API = 'https://discord.com/api/v10'

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isAdmin(session.discordId!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const guildId = process.env.NEXT_PUBLIC_GUILD_ID
  const token = process.env.DISCORD_BOT_TOKEN
  if (!guildId || !token) return NextResponse.json({ channels: [] })

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
  })
  if (!res.ok) return NextResponse.json({ channels: [] })

  const raw: { id: string; name: string; type: number; position: number }[] = await res.json()
  const channels = raw
    .filter(c => c.type === 0 || c.type === 5) // text + announcement
    .sort((a, b) => a.position - b.position)
    .map(c => ({ id: c.id, name: c.name }))

  return NextResponse.json({ channels })
}
