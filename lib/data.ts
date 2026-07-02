import { supabase } from './supabase'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export interface DropEntry {
  name: string
  total: number
}

export interface PlankEntry {
  name: string
  count: number
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
  const { data, error } = await supabase.rpc('monthly_drop_leaderboard', { p_guild_id: GUILD_ID })
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; total: string | number }) => ({
    name: r.player_name,
    total: Number(r.total),
  }))
}

export async function getAlltimeDropLeaderboard(): Promise<DropEntry[]> {
  const { data, error } = await supabase.rpc('alltime_drop_leaderboard', { p_guild_id: GUILD_ID })
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; total: string | number }) => ({
    name: r.player_name,
    total: Number(r.total),
  }))
}

export async function getMonthlyPlankLeaderboard(): Promise<PlankEntry[]> {
  const { data, error } = await supabase.rpc('monthly_plank_leaderboard', { p_guild_id: GUILD_ID })
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; count: string | number }) => ({
    name: r.player_name,
    count: Number(r.count),
  }))
}

export async function getAlltimePlankLeaderboard(): Promise<PlankEntry[]> {
  const { data, error } = await supabase.rpc('alltime_plank_leaderboard', { p_guild_id: GUILD_ID })
  if (error) { console.error(error); return [] }
  return (data ?? []).map((r: { player_name: string; count: string | number }) => ({
    name: r.player_name,
    count: Number(r.count),
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
