import { supabase } from './supabase'
import { getSupabaseAdmin } from './supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function getRsnDisplayNames(): Promise<Map<string, string>> {
  const admin = getSupabaseAdmin()
  const [{ data: links }, { data: activity }] = await Promise.all([
    admin.from('rsn_links').select('discord_id, rsn').eq('guild_id', GUILD_ID),
    admin.from('discord_activity').select('discord_id, display_name').eq('guild_id', GUILD_ID),
  ])
  const nameById = new Map((activity ?? []).filter(a => a.display_name).map(a => [a.discord_id, a.display_name as string]))
  const map = new Map<string, string>()
  for (const link of links ?? []) {
    const name = nameById.get(link.discord_id)
    if (name) map.set(link.rsn.toLowerCase(), name)
  }
  return map
}

export interface DropEntry {
  name: string
  total: number
  discordName?: string | null
}

export interface PlankEntry {
  name: string
  count: number
  discordName?: string | null
}

export interface RecentDrop {
  player_name: string
  gp_value: number
  item_name: string | null
  image_url: string | null
  screenshot_url: string | null
  discord_message_id: string | null
  recorded_at: string
}

export interface RecentPlank {
  player_name: string
  image_url: string | null
  discord_message_id: string | null
  recorded_at: string
}

export async function getMonthlyDropLeaderboard(): Promise<DropEntry[]> {
  const [{ data, error }, names] = await Promise.all([supabase.rpc('monthly_drop_leaderboard', { p_guild_id: GUILD_ID }), getRsnDisplayNames()])
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; total: string | number }) => ({
    name: r.player_name, total: Number(r.total), discordName: names.get(r.player_name) ?? null,
  }))
}

export async function getAlltimeDropLeaderboard(): Promise<DropEntry[]> {
  const [{ data, error }, names] = await Promise.all([supabase.rpc('alltime_drop_leaderboard', { p_guild_id: GUILD_ID }), getRsnDisplayNames()])
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; total: string | number }) => ({
    name: r.player_name, total: Number(r.total), discordName: names.get(r.player_name) ?? null,
  }))
}

export async function getMonthlyPlankLeaderboard(): Promise<PlankEntry[]> {
  const [{ data, error }, names] = await Promise.all([supabase.rpc('monthly_plank_leaderboard', { p_guild_id: GUILD_ID }), getRsnDisplayNames()])
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; count: string | number }) => ({
    name: r.player_name, count: Number(r.count), discordName: names.get(r.player_name) ?? null,
  }))
}

export async function getAlltimePlankLeaderboard(): Promise<PlankEntry[]> {
  const [{ data, error }, names] = await Promise.all([supabase.rpc('alltime_plank_leaderboard', { p_guild_id: GUILD_ID }), getRsnDisplayNames()])
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; count: string | number }) => ({
    name: r.player_name, count: Number(r.count), discordName: names.get(r.player_name) ?? null,
  }))
}

export async function getMostRecentDrop(): Promise<RecentDrop | null> {
  const { data } = await supabase
    .from('drops')
    .select('player_name, gp_value, item_name, image_url, screenshot_url, discord_message_id, recorded_at')
    .eq('guild_id', GUILD_ID)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export interface Achievement {
  id: string
  player_name: string
  title: string
  description: string
  recorded_at: string
}

export async function getRecentAchievements(limit = 15): Promise<Achievement[]> {
  const { data } = await supabase
    .from('achievements')
    .select('id, player_name, title, description, recorded_at')
    .eq('guild_id', GUILD_ID)
    .order('recorded_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export interface PlayerStats {
  totalGp: number
  monthlyGp: number
  dropCount: number
  topDrops: { item_name: string | null; gp_value: number }[]
  totalDeaths: number
  monthlyDeaths: number
  achievements: Achievement[]
}

export async function getPlayerStats(rsn: string): Promise<PlayerStats> {
  const monthStart = new Date(new Date().toISOString().slice(0, 7) + '-01T00:00:00Z').toISOString()
  const [allDrops, monthDrops, allDeaths, monthDeaths, topDrops, achievements] = await Promise.all([
    supabase.from('drops').select('gp_value').eq('guild_id', GUILD_ID).ilike('player_name', rsn),
    supabase.from('drops').select('gp_value').eq('guild_id', GUILD_ID).ilike('player_name', rsn).gte('recorded_at', monthStart),
    supabase.from('planks').select('id', { count: 'exact', head: true }).eq('guild_id', GUILD_ID).ilike('player_name', rsn),
    supabase.from('planks').select('id', { count: 'exact', head: true }).eq('guild_id', GUILD_ID).ilike('player_name', rsn).gte('recorded_at', monthStart),
    supabase.from('drops').select('item_name, gp_value').eq('guild_id', GUILD_ID).ilike('player_name', rsn).order('gp_value', { ascending: false }).limit(3),
    supabase.from('achievements').select('id, player_name, title, description, recorded_at').eq('guild_id', GUILD_ID).ilike('player_name', rsn).order('recorded_at', { ascending: false }).limit(5),
  ])
  return {
    totalGp: (allDrops.data ?? []).reduce((s, r) => s + Number(r.gp_value), 0),
    monthlyGp: (monthDrops.data ?? []).reduce((s, r) => s + Number(r.gp_value), 0),
    dropCount: allDrops.data?.length ?? 0,
    topDrops: topDrops.data ?? [],
    totalDeaths: allDeaths.count ?? 0,
    monthlyDeaths: monthDeaths.count ?? 0,
    achievements: achievements.data ?? [],
  }
}

export async function getAllAchievements(type?: string, limit = 50): Promise<Achievement[]> {
  let q = supabase.from('achievements').select('id, player_name, title, description, recorded_at')
    .eq('guild_id', GUILD_ID).order('recorded_at', { ascending: false }).limit(limit)
  if (type) q = q.ilike('title', `%${type}%`)
  const { data } = await q
  return data ?? []
}

export async function getMostRecentPlank(): Promise<RecentPlank | null> {
  const { data } = await supabase
    .from('planks')
    .select('player_name, image_url, discord_message_id, recorded_at')
    .eq('guild_id', GUILD_ID)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export interface RecentDropItem {
  id: string
  player_name: string
  gp_value: number
  item_name: string | null
  image_url: string | null
  screenshot_url: string | null
  discord_message_id: string | null
  recorded_at: string
}

export async function getRecentDrops(limit = 50): Promise<RecentDropItem[]> {
  const { data } = await supabase
    .from('drops')
    .select('id, player_name, gp_value, item_name, image_url, screenshot_url, discord_message_id, recorded_at')
    .eq('guild_id', GUILD_ID)
    .order('recorded_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as RecentDropItem[]
}

export interface PlayerActivity {
  ingame: { message_count: number; month_count: number; last_message_at: string | null } | null
  discord: { display_name: string | null; message_count: number; month_count: number; last_message_at: string | null } | null
}

export async function getPlayerActivity(rsn: string): Promise<PlayerActivity> {
  const admin = getSupabaseAdmin()
  const [{ data: ingame }, { data: link }] = await Promise.all([
    admin.from('ingame_activity').select('message_count, month_count, last_message_at').eq('guild_id', GUILD_ID).ilike('rsn', rsn).maybeSingle(),
    admin.from('rsn_links').select('discord_id').eq('guild_id', GUILD_ID).ilike('rsn', rsn).maybeSingle(),
  ])
  let discord = null
  if (link?.discord_id) {
    const { data: da } = await admin.from('discord_activity')
      .select('display_name, message_count, month_count, last_message_at')
      .eq('guild_id', GUILD_ID).eq('discord_id', link.discord_id).maybeSingle()
    discord = da ?? null
  }
  return { ingame: ingame ?? null, discord }
}

