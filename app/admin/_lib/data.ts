import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const BOT = process.env.DISCORD_BOT_TOKEN!
const DISCORD = 'https://discord.com/api/v10'

function botFetch(path: string) {
  return fetch(`${DISCORD}${path}`, {
    headers: { Authorization: `Bot ${BOT}` },
    cache: 'no-store',
  })
}

export type Channel = { id: string; name: string }
export type Role = { id: string; name: string }
export type GuildConfig = {
  planks_channel_id?: string | null
  drops_channel_id?: string | null
  lootsubmit_channel_id?: string | null
  welcome_channel_id?: string | null
  welcome_mod_channel_id?: string | null
  welcome_role_id?: string | null
  clanchat_channel_id?: string | null
  broadcast_channel_id?: string | null
  inactivity_channel_id?: string | null
  recap_channel_id?: string | null
  role_panel_config?: RolePanel | null
}
export type RolePanel = { channelId: string | null; messageId: string | null; roles: { roleId: string; emoji: string; label: string }[] }
export type DiscordActivity = { discord_id: string; display_name: string | null; role_name: string | null; rsn: string | null; promotion_note: string | null; message_count: number; month_count: number; last_message_at: string | null }
export type IngameActivity = { rsn: string; message_count: number; month_count: number; last_message_at: string | null }
export type VcActivity = { discord_id: string; display_name: string | null; role_name: string | null; total_minutes: number; month_minutes: number; last_seen_at: string | null }
export type LinkRow = { discord_id: string; rsn: string; linked_at: string; display_name: string | null; primary_rsn: boolean }
export type ClanEvent = { id: string; title: string; description: string | null; event_type: string; scheduled_at: string | null; channel_id: string | null; created_at: string; event_rsvps: { count: number }[] }
export type Raid = { id: string; name: string; timestamp: number; description: string | null; channel_id: string | null; signups: {id:string;username:string}[]; attendees: {id:string;username:string}[] | null }
export type CommandLog = { id: number; discord_id: string; display_name: string | null; command: string; subcommand: string | null; channel_id: string | null; logged_at: string }

export async function fetchChannels(): Promise<Channel[]> {
  const res = await botFetch(`/guilds/${GUILD_ID}/channels`)
  if (!res.ok) return []
  const data = await res.json() as { id: string; name: string; type: number }[]
  return data.filter(c => c.type === 0).sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, name: c.name }))
}

export async function fetchRoles(): Promise<Role[]> {
  const res = await botFetch(`/guilds/${GUILD_ID}/roles`)
  if (!res.ok) return []
  const data = await res.json() as { id: string; name: string; position: number }[]
  return data.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name }))
}

export async function fetchGuildConfig(): Promise<GuildConfig> {
  const { data } = await getSupabaseAdmin().from('guild_config').select('*').eq('guild_id', GUILD_ID).maybeSingle()
  return data ?? {}
}

export async function fetchActivity() {
  const db = getSupabaseAdmin()
  const [{ data: discord }, { data: ingame }, { data: vc }] = await Promise.all([
    db.from('discord_activity').select('*').eq('guild_id', GUILD_ID).order('month_count', { ascending: false }),
    db.from('ingame_activity').select('*').eq('guild_id', GUILD_ID).order('month_count', { ascending: false }),
    db.from('vc_activity').select('*').eq('guild_id', GUILD_ID).order('month_minutes', { ascending: false }),
  ])
  return { discord: (discord ?? []) as DiscordActivity[], ingame: (ingame ?? []) as IngameActivity[], vc: (vc ?? []) as VcActivity[] }
}

export async function fetchLinks(): Promise<LinkRow[]> {
  const db = getSupabaseAdmin()
  const [{ data: links }, { data: activity }] = await Promise.all([
    db.from('rsn_links').select('discord_id, rsn, linked_at, primary_rsn').eq('guild_id', GUILD_ID).order('primary_rsn', { ascending: false }).order('linked_at', { ascending: false }),
    db.from('discord_activity').select('discord_id, display_name').eq('guild_id', GUILD_ID),
  ])
  const nameMap = Object.fromEntries((activity ?? []).filter(a => a.display_name).map(a => [a.discord_id, a.display_name]))
  return (links ?? []).map(l => ({ ...l, display_name: nameMap[l.discord_id] ?? null }))
}

export async function fetchClanEvents(): Promise<ClanEvent[]> {
  const { data } = await getSupabaseAdmin().from('clan_events').select('*, event_rsvps(count)').eq('guild_id', GUILD_ID).order('scheduled_at', { ascending: true, nullsFirst: false })
  return (data ?? []) as ClanEvent[]
}

export async function fetchRaids(): Promise<Raid[]> {
  const { data } = await getSupabaseAdmin().from('raids').select('*').eq('guild_id', GUILD_ID).order('timestamp', { ascending: true })
  return (data ?? []) as Raid[]
}

export async function fetchLogs(): Promise<CommandLog[]> {
  const { data } = await getSupabaseAdmin().from('command_logs').select('*').eq('guild_id', GUILD_ID).order('logged_at', { ascending: false }).limit(200)
  return (data ?? []) as CommandLog[]
}

export { GUILD_ID }
