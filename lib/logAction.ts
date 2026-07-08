import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { Session } from 'next-auth'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export function logAdminAction(session: Session, command: string, subcommand: string | null, details?: string) {
  getSupabaseAdmin().from('command_logs').insert({
    guild_id: GUILD_ID,
    discord_id: session.discordId,
    display_name: session.user?.name ?? null,
    command,
    subcommand,
    details: details ?? null,
    source: 'web',
  }).then(() => {}, () => {})
}
