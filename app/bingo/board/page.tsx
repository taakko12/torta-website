import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getApprovedSubmissions, computeTeamProgress,
} from '@/lib/bingo'
import BingoBoardView from '@/components/BingoBoardView'

export const revalidate = 15

export default async function BingoBoardPage() {
  const event = await getActiveEvent()

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-[#c89b3c] text-xl font-bold uppercase tracking-widest mb-2">No Active Bingo</p>
        <p className="text-sm text-[#6868a0]">Check back when the next event is live.</p>
      </div>
    )
  }

  const [tasks, teams, submissions] = await Promise.all([
    getEventTasks(event.id),
    getEventTeams(event.id),
    getApprovedSubmissions(event.id),
  ])

  const teamIds = teams.map(t => t.id)
  const allMembers = await getTeamMembers(teamIds)
  const membersByTeam = Object.fromEntries(teamIds.map(id => [id, allMembers.filter(m => m.team_id === id)]))
  const progress = computeTeamProgress(teams, membersByTeam, tasks, submissions)

  // Serialize all progress (Set → array) for RSC boundary
  const allProgress = progress.map(p => ({
    team: { id: p.team.id, name: p.team.name, color: p.team.color },
    taskProgress: p.taskProgress,
    completedTaskIds: [...p.completedTasks],
    totalPoints: p.totalPoints,
    members: p.members,
  }))

  const rsnTeamMap: Record<string, { name: string; color: string }> = {}
  for (const team of teams) {
    for (const m of membersByTeam[team.id] ?? []) {
      rsnTeamMap[m.rsn.toLowerCase()] = { name: team.name, color: team.color }
    }
  }

  const submissionsProp = submissions.map(s => ({
    id: s.id, task_id: s.task_id, rsn: s.rsn,
    screenshot_url: s.screenshot_url, notes: s.notes, submitted_at: s.submitted_at,
  }))

  const tasksProp = tasks.map(t => ({
    id: t.id, position: t.position, title: t.title, description: t.description ?? null,
    image_url: t.image_url ?? null, points: t.points, required_count: t.required_count,
    points_per_submission: t.points_per_submission ?? null,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#c89b3c] uppercase tracking-widest">{event.title}</h1>
        <p className="text-xs text-[#6868a0] mt-1">
          {event.board_size}×{event.board_size} · {tasks.length} tasks · {teams.length} teams
        </p>
      </div>

      <BingoBoardView
        boardSize={event.board_size}
        tasks={tasksProp}
        defaultTeamId={allProgress[0]?.team.id}
        allProgress={allProgress}
        submissions={submissionsProp}
        rsnTeamMap={rsnTeamMap}
      />
    </div>
  )
}
