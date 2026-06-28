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
