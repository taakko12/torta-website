import { supabase } from './supabase'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export interface BingoEvent {
  id: string
  guild_id: string
  title: string
  board_size: number
  active: boolean
  created_at: string
}

export interface BingoTask {
  id: string
  event_id: string
  position: number
  title: string
  description: string | null
  image_url: string | null
  points: number
  required_count: number
}

export interface BingoTeam {
  id: string
  event_id: string
  name: string
  color: string
}

export interface BingoTeamMember {
  id: string
  team_id: string
  rsn: string
}

export interface BingoSubmission {
  id: string
  event_id: string
  task_id: string
  rsn: string
  screenshot_url: string | null
  screenshot_path: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface TeamProgress {
  team: BingoTeam
  members: string[]
  taskProgress: Record<string, number>
  completedTasks: Set<string>
  totalPoints: number
}

export async function getActiveEvent(): Promise<BingoEvent | null> {
  const { data } = await supabase
    .from('bingo_events')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  return data
}

export async function getAllEvents(): Promise<BingoEvent[]> {
  const { data } = await supabase
    .from('bingo_events')
    .select('*')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getEventTasks(eventId: string): Promise<BingoTask[]> {
  const { data } = await supabase
    .from('bingo_tasks')
    .select('*')
    .eq('event_id', eventId)
    .order('position')
  return data ?? []
}

export async function getEventTeams(eventId: string): Promise<BingoTeam[]> {
  const { data } = await supabase
    .from('bingo_teams')
    .select('*')
    .eq('event_id', eventId)
  return data ?? []
}

export async function getTeamMembers(teamIds: string[]): Promise<BingoTeamMember[]> {
  if (!teamIds.length) return []
  const { data } = await supabase
    .from('bingo_team_members')
    .select('*')
    .in('team_id', teamIds)
  return data ?? []
}

export async function getApprovedSubmissions(eventId: string): Promise<BingoSubmission[]> {
  const { data } = await supabase
    .from('bingo_submissions')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'approved')
  return data ?? []
}

export async function getPendingSubmissions(eventId: string): Promise<BingoSubmission[]> {
  const { data } = await supabase
    .from('bingo_submissions')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
  return data ?? []
}

export function computeTeamProgress(
  teams: BingoTeam[],
  membersByTeam: Record<string, BingoTeamMember[]>,
  tasks: BingoTask[],
  submissions: BingoSubmission[]
): TeamProgress[] {
  return teams.map(team => {
    const members = (membersByTeam[team.id] ?? []).map(m => m.rsn.toLowerCase())
    const taskProgress: Record<string, number> = {}

    for (const sub of submissions) {
      if (!members.includes(sub.rsn.toLowerCase())) continue
      taskProgress[sub.task_id] = (taskProgress[sub.task_id] ?? 0) + 1
    }

    const completedTasks = new Set<string>()
    let totalPoints = 0
    for (const task of tasks) {
      if ((taskProgress[task.id] ?? 0) >= task.required_count) {
        completedTasks.add(task.id)
        totalPoints += task.points
      }
    }

    return {
      team,
      members: membersByTeam[team.id]?.map(m => m.rsn) ?? [],
      taskProgress,
      completedTasks,
      totalPoints,
    }
  })
}
