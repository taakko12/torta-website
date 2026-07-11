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
  coffer_channel_id?: string | null
  coffer_leaderboard_channel_id?: string | null
  inactivity_channel_id?: string | null
  recap_channel_id?: string | null
  changelog_channel_id?: string | null
  rules_content?: string | null
  role_panel_config?: RolePanel | null
  owner_role_name?: string | null
  staff_role_names?: string[] | null
  comp_sotw_days?: string | null
  comp_botw_days?: string | null
  comp_poll_day?: number | null
  comp_poll_hour?: number | null
}
export type RolePanel = { channelId: string | null; messageId: string | null; roles: { roleId: string; emoji: string; label: string }[] }
export type DiscordActivity = { discord_id: string; display_name: string | null; role_name: string | null; rsn: string | null; promotion_note: string | null; message_count: number; month_count: number; last_message_at: string | null }
export type IngameActivity = { rsn: string; message_count: number; month_count: number; last_message_at: string | null }
export type VcActivity = { discord_id: string; display_name: string | null; role_name: string | null; total_minutes: number; month_minutes: number; last_seen_at: string | null }
export type LinkRow = { discord_id: string; rsn: string; linked_at: string; display_name: string | null; primary_rsn: boolean }
export type ClanEvent = { id: string; title: string; description: string | null; event_type: string; scheduled_at: string | null; channel_id: string | null; created_at: string; event_rsvps: { count: number }[] }
export type Raid = { id: string; name: string; timestamp: number; description: string | null; channel_id: string | null; signups: {id:string;username:string}[]; attendees: {id:string;username:string}[] | null }
export type CommandLog = { id: number; discord_id: string; display_name: string | null; command: string; subcommand: string | null; channel_id: string | null; logged_at: string; source?: string | null; details?: string | null }
export type Recruitment = { id: number; guild_id: string; recruiter_rsn: string | null; recruit_discord_id: string; recruit_rsn: string; recruited_at: string }
export type MemberNote = { id: number; guild_id: string; discord_id: string; note: string; created_by_discord_id: string | null; created_by_name: string | null; created_at: string }
export type Absence = { id: number; guild_id: string; discord_id: string; display_name: string | null; rsn: string | null; reason: string | null; return_date: string | null; created_at: string; returned_at: string | null }
export type ChangelogEntry = { id: number; guild_id: string; title: string; content: string | null; category: string; discord_message_id: string | null; created_by_discord_id: string | null; created_by_name: string | null; published_at: string }
export type BlacklistEntry = { id: number; guild_id: string; discord_id: string | null; rsn: string | null; reason: string; removed_by_name: string | null; created_at: string }
export type Promotion = { id: number; guild_id: string; discord_id: string | null; display_name: string | null; rsn: string | null; from_role: string; to_role: string; promoted_by_name: string | null; notes: string | null; promoted_at: string }
export type Drop = { id: number; guild_id: string; player_name: string; gp_value: number; item_name: string | null; image_url: string | null; screenshot_url: string | null; recorded_at: string }
export type CofferEntry = { player: string; net: number }
export type DashboardStats = { memberCount: number; newThisWeek: number; absenceCount: number; blacklistCount: number; nextEvent: { title: string; scheduled_at: string } | null; recentLogs: CommandLog[]; cofferLeaderboard: CofferEntry[] }
export type Ticket = { id: number; guild_id: string; discord_id: string; display_name: string | null; subject: string | null; status: string; created_at: string; closed_at: string | null; message_count?: number }
export type TicketMessage = { id: number; ticket_id: number; author_discord_id: string; author_name: string | null; content: string; direction: 'inbound' | 'outbound'; sent_at: string }

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

export async function fetchRecruitments(): Promise<Recruitment[]> {
  const { data } = await getSupabaseAdmin().from('recruitments').select('*').eq('guild_id', GUILD_ID).order('recruited_at', { ascending: false }).limit(200)
  return (data ?? []) as Recruitment[]
}

export async function fetchMemberNotes(): Promise<MemberNote[]> {
  const { data } = await getSupabaseAdmin().from('member_notes').select('*').eq('guild_id', GUILD_ID).order('created_at', { ascending: false }).limit(500)
  return (data ?? []) as MemberNote[]
}

export async function fetchAbsences(): Promise<Absence[]> {
  const { data } = await getSupabaseAdmin().from('absences').select('*').eq('guild_id', GUILD_ID).is('returned_at', null).order('created_at', { ascending: false })
  return (data ?? []) as Absence[]
}

export async function fetchChangelog(): Promise<ChangelogEntry[]> {
  const { data } = await getSupabaseAdmin().from('changelog').select('*').eq('guild_id', GUILD_ID).order('published_at', { ascending: false }).limit(100)
  return (data ?? []) as ChangelogEntry[]
}

export async function fetchBlacklist(): Promise<BlacklistEntry[]> {
  const { data } = await getSupabaseAdmin().from('blacklist').select('*').eq('guild_id', GUILD_ID).order('created_at', { ascending: false })
  return (data ?? []) as BlacklistEntry[]
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const { data } = await getSupabaseAdmin().from('promotions').select('*').eq('guild_id', GUILD_ID).order('promoted_at', { ascending: false }).limit(200)
  return (data ?? []) as Promotion[]
}

export async function fetchDrops(): Promise<Drop[]> {
  const { data } = await getSupabaseAdmin().from('drops').select('id, guild_id, player_name, gp_value, item_name, image_url, screenshot_url, recorded_at').eq('guild_id', GUILD_ID).order('recorded_at', { ascending: false }).limit(300)
  return (data ?? []) as Drop[]
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const db = getSupabaseAdmin()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const [
    { count: memberCount },
    { count: newThisWeek },
    { count: absenceCount },
    { count: blacklistCount },
    { data: nextEvents },
    { data: recentLogs },
    { data: cofferRows },
  ] = await Promise.all([
    db.from('rsn_links').select('*', { count: 'exact', head: true }).eq('guild_id', GUILD_ID).eq('primary_rsn', true),
    db.from('rsn_links').select('*', { count: 'exact', head: true }).eq('guild_id', GUILD_ID).eq('primary_rsn', true).gte('linked_at', weekAgo),
    db.from('absences').select('*', { count: 'exact', head: true }).eq('guild_id', GUILD_ID).is('returned_at', null),
    db.from('blacklist').select('*', { count: 'exact', head: true }).eq('guild_id', GUILD_ID),
    db.from('clan_events').select('title, scheduled_at').eq('guild_id', GUILD_ID).gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1),
    db.from('command_logs').select('*').eq('guild_id', GUILD_ID).order('logged_at', { ascending: false }).limit(8),
    db.from('coffer_deposits').select('player, gp, action').eq('guild_id', GUILD_ID),
  ])
  const cofferTotals: Record<string, number> = {}
  for (const row of (cofferRows ?? []) as { player: string; gp: number; action: string }[]) {
    cofferTotals[row.player] = (cofferTotals[row.player] ?? 0) + (row.action === 'deposited' ? Number(row.gp) : -Number(row.gp))
  }
  const cofferLeaderboard = Object.entries(cofferTotals)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([player, net]) => ({ player, net }))
  return {
    memberCount: memberCount ?? 0,
    newThisWeek: newThisWeek ?? 0,
    absenceCount: absenceCount ?? 0,
    blacklistCount: blacklistCount ?? 0,
    nextEvent: nextEvents?.[0] ?? null,
    recentLogs: (recentLogs ?? []) as CommandLog[],
    cofferLeaderboard,
  }
}

export async function fetchTickets(): Promise<Ticket[]> {
  const { data } = await getSupabaseAdmin()
    .from('tickets')
    .select('*, ticket_messages(count)')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
    .limit(200)
  return ((data ?? []) as (Ticket & { ticket_messages: { count: number }[] })[]).map(t => ({
    ...t,
    message_count: t.ticket_messages?.[0]?.count ?? 0,
  }))
}

export async function fetchOpenTicketCount(): Promise<number> {
  const { count } = await getSupabaseAdmin().from('tickets').select('*', { count: 'exact', head: true }).eq('guild_id', GUILD_ID).eq('status', 'open')
  return count ?? 0
}

export async function fetchPendingApplicationCount(): Promise<number> {
  const { count } = await getSupabaseAdmin().from('applications').select('*', { count: 'exact', head: true }).eq('guild_id', GUILD_ID).eq('status', 'pending')
  return count ?? 0
}

export async function fetchTicket(id: number): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null> {
  const db = getSupabaseAdmin()
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    db.from('tickets').select('*').eq('id', id).eq('guild_id', GUILD_ID).single(),
    db.from('ticket_messages').select('*').eq('ticket_id', id).order('sent_at', { ascending: true }),
  ])
  if (!ticket) return null
  return { ticket: ticket as Ticket, messages: (messages ?? []) as TicketMessage[] }
}

export async function fetchMembersForPromotion() {
  const db = getSupabaseAdmin()
  const [{ data: links }, { data: activity }] = await Promise.all([
    db.from('rsn_links').select('discord_id, rsn').eq('guild_id', GUILD_ID).eq('primary_rsn', true),
    db.from('discord_activity').select('discord_id, display_name, role_name').eq('guild_id', GUILD_ID),
  ])
  const rsnMap = Object.fromEntries((links ?? []).map(l => [l.discord_id, l.rsn]))
  return (activity ?? [])
    .filter(a => a.display_name)
    .map(a => ({
      discord_id: a.discord_id as string,
      display_name: a.display_name as string,
      rsn: rsnMap[a.discord_id] ?? null as string | null,
      role_name: a.role_name as string | null,
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
}

export async function fetchPublicMembers() {
  const db = getSupabaseAdmin()
  const [{ data: links }, { data: activity }] = await Promise.all([
    db.from('rsn_links').select('discord_id, rsn, linked_at').eq('guild_id', GUILD_ID).eq('primary_rsn', true).order('linked_at', { ascending: false }),
    db.from('discord_activity').select('discord_id, display_name, role_name').eq('guild_id', GUILD_ID),
  ])
  const actMap = Object.fromEntries((activity ?? []).map(a => [a.discord_id, a]))
  return (links ?? []).map(l => ({
    rsn: l.rsn as string,
    linked_at: l.linked_at as string,
    display_name: actMap[l.discord_id]?.display_name ?? null as string | null,
    role_name: actMap[l.discord_id]?.role_name ?? null as string | null,
  }))
}

export { GUILD_ID }
