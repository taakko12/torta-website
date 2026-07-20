import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'

const DISCORD_API = 'https://discord.com/api/v10'

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const guildId = process.env.NEXT_PUBLIC_GUILD_ID
  const token = process.env.DISCORD_BOT_TOKEN
  if (!guildId || !token) return NextResponse.json({ roles: [] })

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${token}` },
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[roles] Discord API ${res.status}:`, err)
    return NextResponse.json({ roles: [], _error: `Discord ${res.status}` })
  }

  const raw: { id: string; name: string; position: number; managed: boolean }[] = await res.json()
  const roles = raw
    .filter(r => !r.managed && r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map(r => ({ id: r.id, name: r.name }))

  if (roles.length === 0) console.warn(`[roles] 0 assignable roles found (raw: ${raw.length} total)`)
  return NextResponse.json({ roles })
}
