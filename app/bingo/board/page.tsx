import Link from 'next/link'
import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getApprovedSubmissions, computeTeamProgress,
} from '@/lib/bingo'
import BingoBoardGrid from '@/components/BingoBoardGrid'

export const revalidate = 15

type Props = { searchParams: Promise<{ team?: string }> }

export default async function BingoBoardPage({ searchParams }: Props) {
  const { team: selectedTeamId } = await searchParams
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
  const sorted = [...progress].sort((a, b) => b.totalPoints - a.totalPoints)

  const activeTeamProgress = progress.find(p => p.team.id === selectedTeamId) ?? progress[0]
  const totalPossible = tasks.reduce((s, t) => s + t.points, 0)

  // Serialize for client component (Set → array, Map → object)
  const activeTeamProp = activeTeamProgress ? {
    team: { id: activeTeamProgress.team.id, name: activeTeamProgress.team.name, color: activeTeamProgress.team.color },
    taskProgress: activeTeamProgress.taskProgress,
    completedTaskIds: [...activeTeamProgress.completedTasks],
  } : null

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#c89b3c] uppercase tracking-widest">{event.title}</h1>
        <p className="text-xs text-[#6868a0] mt-1">{event.board_size}×{event.board_size} board · {tasks.length} tasks · click any tile for details</p>
      </div>

      {/* Team tabs */}
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {progress.map(p => (
            <Link
              key={p.team.id}
              href={`/bingo/board?team=${p.team.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                activeTeamProgress?.team.id === p.team.id
                  ? 'text-[#07070f] border-transparent'
                  : 'bg-[#141427] text-[#a0a0c0] border-[#2a2a4a] hover:text-[#e8e8f0]'
              }`}
              style={activeTeamProgress?.team.id === p.team.id ? { backgroundColor: p.team.color, borderColor: p.team.color } : {}}
            >
              {p.team.name} · {p.totalPoints}pts
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Board grid — client component handles clicks + modal */}
        <div className="flex-1 min-w-0">
          <BingoBoardGrid
            boardSize={event.board_size}
            tasks={tasks}
            activeTeam={activeTeamProp}
            submissions={submissionsProp}
            rsnTeamMap={rsnTeamMap}
          />
        </div>

        {/* Leaderboard sidebar */}
        <div className="xl:w-64 shrink-0 space-y-4">
          <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Leaderboard</h2>
              <span className="text-xs text-[#6868a0]">{totalPossible} pts total</span>
            </div>
            {sorted.length === 0 ? (
              <p className="text-xs text-[#6868a0]">No teams yet.</p>
            ) : (
              <ul className="space-y-4">
                {sorted.map((p, i) => {
                  const pct = totalPossible > 0 ? Math.round((p.totalPoints / totalPossible) * 100) : 0
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                  return (
                    <li key={p.team.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {medal
                            ? <span className="text-sm shrink-0">{medal}</span>
                            : <span className="text-xs text-[#6868a0] w-4 text-right shrink-0">{i + 1}</span>}
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.team.color }} />
                          <span className="text-sm font-semibold text-[#e8e8f0] truncate">{p.team.name}</span>
                        </div>
                        <span className="text-xs font-bold shrink-0 ml-2" style={{ color: p.team.color }}>
                          {p.totalPoints}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#141427] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 bar-shimmer"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${p.team.color}aa, ${p.team.color})`,
                            boxShadow: `0 0 8px ${p.team.color}60`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-[#6868a0] mt-1">{pct}% · {p.completedTasks.size}/{tasks.length} tiles</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {activeTeamProgress && (
            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: activeTeamProgress.team.color }}>
                {activeTeamProgress.team.name}
              </h2>
              <p className="text-xs text-[#6868a0] mb-2">Members</p>
              {activeTeamProgress.members.length === 0 ? (
                <p className="text-xs text-[#6868a0] italic">None assigned</p>
              ) : (
                <ul className="space-y-1">
                  {activeTeamProgress.members.map(rsn => (
                    <li key={rsn} className="text-xs text-[#e8e8f0]">{rsn}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
