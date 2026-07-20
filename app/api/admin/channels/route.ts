import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'

const DISCORD_API = 'https://discord.com/api/v10'

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

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
