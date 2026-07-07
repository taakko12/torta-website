import type { NextAuthOptions } from 'next-auth'
import { getServerSession as _get } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

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
    if (!memberRes.ok || !adminRoleId) return false
    const member = await memberRes.json()
    return (member.roles as string[]).includes(adminRoleId)
  } catch {
    return false
  }
}
