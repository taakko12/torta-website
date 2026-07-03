import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' })

  const guildId = process.env.NEXT_PUBLIC_GUILD_ID
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID
  const botToken = process.env.DISCORD_BOT_TOKEN
  const discordId = session.discordId

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: 'no-store',
  })

  const body = await res.json()

  return NextResponse.json({
    discordId,
    guildId,
    adminRoleId,
    hasBotToken: !!botToken,
    discordApiStatus: res.status,
    memberRoles: body.roles ?? null,
    hasAdminRole: (body.roles ?? []).includes(adminRoleId),
    rawResponse: body,
  })
}
