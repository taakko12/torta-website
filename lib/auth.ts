import type { NextAuthOptions } from 'next-auth'
import { getServerSession as _get } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

declare module 'next-auth' {
  interface Session { discordId?: string }
}
declare module 'next-auth/jwt' {
  interface JWT { discordId?: string }
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
      if (profile) token.discordId = (profile as { id: string }).id
      return token
    },
    async session({ session, token }) {
      session.discordId = token.discordId
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const getServerSession = () => _get(authOptions)

export async function isAdmin(discordId: string): Promise<boolean> {
  const guildId = process.env.NEXT_PUBLIC_GUILD_ID!
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID!
  const botToken = process.env.DISCORD_BOT_TOKEN!
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const member = await res.json()
    return (member.roles as string[]).includes(adminRoleId)
  } catch {
    return false
  }
}
