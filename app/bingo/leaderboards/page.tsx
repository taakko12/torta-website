import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getApprovedSubmissions, computeTeamProgress,
} from '@/lib/bingo'

export const revalidate = 15

export default async function LeaderboardsPage() {
  const event = await getActiveEvent()

  if (!event) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#6868a0] text-sm">No active event.</p>
      </div>
    )
  }

  const [tasks, teams, submissions] = await Promise.all([
    getEventTasks(event.id),
    getEventTeams(event.id),
    getApprovedSubmissions(event.id),
  ])

  const teamIds = teams.map(t => t.id)
  const allMembers = teamIds.length ? await getTeamMembers(teamIds) : []
  const membersByTeam = Object.fromEntries(teamIds.map(id => [id, allMembers.filter(m => m.team_id === id)]))
  const progress = computeTeamProgress(teams, membersByTeam, tasks, submissions)
  const sorted = [...progress].sort((a, b) => b.totalPoints - a.totalPoints)
  const totalPossible = tasks.reduce((s, t) => s + t.points, 0)

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Leaderboards</h1>
        <p className="text-sm text-[#6868a0]">{event.title} · {totalPossible} total points possible</p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] p-10 text-center">
          <p className="text-[#4a4a70] text-sm">No teams have been created yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] overflow-hidden">
          {sorted.map((p, i) => {
            const pct = totalPossible > 0 ? Math.round((p.totalPoints / totalPossible) * 100) : 0
            const medals = ['🥇', '🥈', '🥉']
            return (
              <div key={p.team.id} className="px-5 py-4 border-b border-[#1a1a30] last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl w-8 text-center shrink-0">{medals[i] ?? `#${i + 1}`}</span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-[#07070f] shrink-0"
                    style={{ backgroundColor: p.team.color }}
                  >
                    {p.team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-[#e8e8f0] truncate">{p.team.name}</p>
                    <p className="text-xs text-[#4a4a70]">{p.members.join(', ') || 'No members'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black" style={{ color: p.team.color }}>
                      {p.totalPoints.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[#4a4a70]">pts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-11">
                  <div className="flex-1 h-2 rounded-full bg-[#141427] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bar-shimmer"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${p.team.color}80, ${p.team.color})`,
                        boxShadow: i === 0 ? `0 0 10px ${p.team.color}50` : undefined,
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#6868a0] shrink-0 w-28 text-right">
                    {pct}% · {p.completedTasks.size}/{tasks.length} tiles
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
