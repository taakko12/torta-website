import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getApprovedSubmissions, computeTeamProgress,
} from '@/lib/bingo'

export const revalidate = 15

export default async function TeamsPage() {
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
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Teams</h1>
        <p className="text-sm text-[#6868a0]">{event.title} · {teams.length} teams competing</p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] p-10 text-center">
          <p className="text-[#4a4a70] text-sm">No teams have been created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sorted.map((p, i) => {
            const pct = totalPossible > 0 ? Math.round((p.totalPoints / totalPossible) * 100) : 0
            return (
              <div
                key={p.team.id}
                className="rounded-xl border bg-[#161628] p-5 relative overflow-hidden"
                style={{ borderColor: `${p.team.color}40` }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                  style={{ background: `linear-gradient(90deg, ${p.team.color}, ${p.team.color}80)` }}
                />
                <div className="flex items-start justify-between gap-3 mt-1 mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">{p.team.name}</h2>
                    <p className="text-xs text-[#4a4a70]">Rank #{i + 1}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: p.team.color }}>
                      {p.totalPoints}
                    </p>
                    <p className="text-[11px] text-[#4a4a70]">points</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-[#4a4a70] mb-1.5">
                    <span>{p.completedTasks.size}/{tasks.length} tiles completed</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1c1c36] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: p.team.color }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70] mb-2">Members</p>
                  {p.members.length === 0 ? (
                    <p className="text-xs text-[#4a4a70] italic">No members assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {p.members.map(rsn => (
                        <span
                          key={rsn}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${p.team.color}20`, color: p.team.color }}
                        >
                          {rsn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
