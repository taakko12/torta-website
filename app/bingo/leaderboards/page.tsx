import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getApprovedSubmissions, computeTeamProgress,
} from '@/lib/bingo'
import { getGroupBulkGained, isBossMetric } from '@/lib/wom'
import BingoLeaderboards from '@/components/BingoLeaderboards'

export const revalidate = 15

export default async function LeaderboardsPage() {
  const event = await getActiveEvent()

  if (!event) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#6868a0] text-sm">No active bingo event.</p>
      </div>
    )
  }

  const [tasks, teams, submissions, bulkGains] = await Promise.all([
    getEventTasks(event.id),
    getEventTeams(event.id),
    getApprovedSubmissions(event.id),
    getGroupBulkGained(event.created_at),
  ])

  const teamIds = teams.map(t => t.id)
  const allMembers = teamIds.length ? await getTeamMembers(teamIds) : []
  const membersByTeam = Object.fromEntries(teamIds.map(id => [id, allMembers.filter(m => m.team_id === id)]))
  const progress = computeTeamProgress(teams, membersByTeam, tasks, submissions)

  // Per-member task submission counts
  const taskProgressByMember: Record<string, Record<string, number>> = {}
  for (const sub of submissions) {
    const rsn = sub.rsn.toLowerCase()
    taskProgressByMember[rsn] ??= {}
    taskProgressByMember[rsn][sub.task_id] = (taskProgressByMember[rsn][sub.task_id] ?? 0) + 1
  }

  // Per-player bingo points: proportional credit per submission
  const playerPoints: Record<string, number> = {}
  for (const [rsn, taskCounts] of Object.entries(taskProgressByMember)) {
    let pts = 0
    for (const [taskId, count] of Object.entries(taskCounts)) {
      const task = tasks.find(t => t.id === taskId)
      if (!task) continue
      const pps = task.points_per_submission ?? (task.points / task.required_count)
      pts += Math.min(count * pps, task.points)
    }
    playerPoints[rsn] = Math.round(pts * 100) / 100
  }

  // Team stats
  const teamStats = Object.fromEntries(
    progress.map(p => [p.team.id, { points: p.totalPoints, completedCount: p.completedTasks.size }])
  )

  // EHB gained per member — extracted from bulk gains response
  const memberEhb: Record<string, number> = {}
  for (const m of allMembers) {
    const rsn = m.rsn.toLowerCase()
    memberEhb[rsn] = bulkGains[rsn]?.metrics['ehb'] ?? 0
  }

  // Boss KC gains per member — used for the Kill Matrix "Boss Gains" view
  const bossGains: Record<string, Record<string, number>> = {}
  for (const [rsn, gains] of Object.entries(bulkGains)) {
    const bosses: Record<string, number> = {}
    for (const [metric, gained] of Object.entries(gains.metrics)) {
      if (isBossMetric(metric) && gained > 0) bosses[metric] = gained
    }
    if (Object.keys(bosses).length) bossGains[rsn] = bosses
  }

  const womAvailable = !!process.env.WOM_GROUP_ID

  return (
    <BingoLeaderboards
      tasks={tasks.map(t => ({
        id: t.id, position: t.position, title: t.title,
        image_url: t.image_url ?? null, points: t.points,
        required_count: t.required_count,
      }))}
      teams={teams.map(t => ({ id: t.id, name: t.name, color: t.color }))}
      members={allMembers.map(m => ({ rsn: m.rsn, teamId: m.team_id }))}
      playerPoints={playerPoints}
      teamStats={teamStats}
      memberEhb={memberEhb}
      taskProgressByMember={taskProgressByMember}
      bossGains={bossGains}
      womAvailable={womAvailable}
    />
  )
}
