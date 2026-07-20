import type { NextAuthOptions, Session } from 'next-auth'
import { getServerSession as _get } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { NextResponse } from 'next/server'

declare module 'next-auth' {
  interface Session { discordId?: string; isAdmin?: boolean }
}
declare module 'next-auth/jwt' {
  interface JWT { discordId?: string; isAdmin?: boolean }
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.discordId = (profile as { id: string }).id
        token.isAdmin = await isAdmin(token.discordId!)
      }
      return token
    },
    async session({ session, token }) {
      session.discordId = token.discordId
      session.isAdmin = token.isAdmin
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const getServerSession = () => _get(authOptions)

// Shared admin-gate for API routes: `const session = await requireAdminSession(); if (session instanceof NextResponse) return session`
export async function requireAdminSession(): Promise<Session | NextResponse> {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

export async function isAdmin(discordId: string): Promise<boolean> {
  const guildId = process.env.NEXT_PUBLIC_GUILD_ID!
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID
  const botToken = process.env.DISCORD_BOT_TOKEN!
  try {
    const [memberRes, guildRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store',
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store',
      }),
    ])
    if (guildRes.ok) {
      const guild = await guildRes.json()
      if (guild.owner_id === discordId) return true
    }
    if (!memberRes.ok) {
      console.warn(`[isAdmin] member fetch failed: ${memberRes.status} for user ${discordId}`)
      return false
    }
    if (!adminRoleId) {
      console.warn('[isAdmin] DISCORD_ADMIN_ROLE_ID not set')
      return false
    }
    const member = await memberRes.json()
    const has = (member.roles as string[]).includes(adminRoleId)
    if (!has) console.warn(`[isAdmin] user ${discordId} roles [${member.roles}] does not include ${adminRoleId}`)
    return has
  } catch (e) {
    console.error('[isAdmin] threw:', e)
    return false
  }
}
