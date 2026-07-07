import {
  getActiveEvent, getEventTasks, getEventTeams, getTeamMembers,
  getApprovedSubmissions, computeTeamProgress, getRecentSubmissions,
} from '@/lib/bingo'
import { ClientDate } from '@/components/ClientDate'

export const revalidate = 15

export default async function BingoDashboard() {
  const event = await getActiveEvent()

  if (!event) {
    return (
      <div className="px-8 py-24 text-center">
        <p className="text-5xl mb-5">🎯</p>
        <p className="text-[#c89b3c] text-xl font-black uppercase tracking-widest mb-2">No Active Bingo</p>
        <p className="text-sm text-[#6868a0]">Check back when the next event goes live.</p>
      </div>
    )
  }

  const [tasks, teams, approvedSubs, recentSubs] = await Promise.all([
    getEventTasks(event.id),
    getEventTeams(event.id),
    getApprovedSubmissions(event.id),
    getRecentSubmissions(event.id, 20),
  ])

  const teamIds = teams.map(t => t.id)
  const allMembers = teamIds.length ? await getTeamMembers(teamIds) : []
  const membersByTeam = Object.fromEntries(teamIds.map(id => [id, allMembers.filter(m => m.team_id === id)]))
  const progress = computeTeamProgress(teams, membersByTeam, tasks, approvedSubs)
  const sorted = [...progress].sort((a, b) => b.totalPoints - a.totalPoints)

  const totalPossible = tasks.reduce((s, t) => s + t.points, 0)
  const leader = sorted[0]
  const runner = sorted[1]
  const leadGap = leader && runner ? leader.totalPoints - runner.totalPoints : 0

  const totalEarned = progress.reduce((s, p) => s + p.totalPoints, 0)
  const maxEarnable = totalPossible * Math.max(teams.length, 1)
  const boardPct = Math.round((totalEarned / maxEarnable) * 100)

  const rsnToTeam = new Map<string, typeof teams[0]>()
  for (const team of teams) {
    for (const m of membersByTeam[team.id] ?? []) {
      rsnToTeam.set(m.rsn.toLowerCase(), team)
    }
  }
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const approvedFeed = recentSubs.filter(s => s.status === 'approved')

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Event header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-[#57f287]/10 text-[#57f287] border border-[#57f287]/20 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#57f287] animate-pulse" />
            Live Tournament
          </span>
          <span className="text-xs text-[#7878a8]">
            {event.board_size}×{event.board_size} · {tasks.length} tasks · {teams.length} teams
          </span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tight text-white">{event.title}</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main: standings + stats */}
        <div className="xl:col-span-2 space-y-5">

          {/* Leader callout */}
          {leader && leader.totalPoints > 0 && (
            <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] p-5 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 80% 100% at 100% 50%, ${leader.team.color}12, transparent)` }}
              />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8] mb-2">Current Leader</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-2xl font-black text-white">{leader.team.name}</h2>
                <span className="text-[#6868a0] text-sm">leads with</span>
                <span className="text-2xl font-black" style={{ color: leader.team.color }}>
                  {leader.totalPoints.toLocaleString()} pts
                </span>
              </div>
              {runner && (
                <p className="mt-2 text-sm text-[#6868a0]">
                  <span
                    className="font-bold px-2 py-0.5 rounded text-xs mr-1.5"
                    style={{ backgroundColor: `${leader.team.color}25`, color: leader.team.color }}
                  >
                    +{leadGap}
                  </span>
                  ahead of {runner.team.name}
                </p>
              )}
            </div>
          )}

          {/* Live standings */}
          <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#6868a0] mb-5">Live Standings</h2>
            {sorted.length === 0 ? (
              <p className="text-sm text-[#7878a8]">No teams yet.</p>
            ) : (
              <div className="space-y-5">
                {sorted.map((p, i) => {
                  const leaderPts = sorted[0].totalPoints || 1
                  const barPct = Math.max(2, Math.round((p.totalPoints / leaderPts) * 100))
                  return (
                    <div key={p.team.id}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-sm w-6 text-center shrink-0">{i === 0 ? '👑' : `#${i + 1}`}</span>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-[#0f0f1e] shrink-0"
                          style={{ backgroundColor: p.team.color }}
                        >
                          {p.team.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-[#e8e8f0] flex-1 truncate">{p.team.name}</span>
                        <span className="text-xs text-[#7878a8] shrink-0">{p.completedTasks.size}/{tasks.length} tiles</span>
                        <span className="text-sm font-bold shrink-0 w-20 text-right" style={{ color: p.team.color }}>
                          {p.totalPoints.toLocaleString()} pts
                        </span>
                      </div>
                      <div className="ml-[3.625rem] h-2.5 rounded-full bg-[#1c1c36] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 bar-shimmer"
                          style={{
                            width: `${barPct}%`,
                            background: `linear-gradient(90deg, ${p.team.color}80, ${p.team.color})`,
                            boxShadow: i === 0 ? `0 0 12px ${p.team.color}60` : undefined,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Event stats */}
          <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#6868a0] mb-4">Event Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Points Pool', value: totalPossible.toLocaleString(), color: '#c89b3c' },
                { label: 'Tiles', value: tasks.length, color: '#e8e8f0' },
                { label: 'Drops Approved', value: approvedSubs.length, color: '#57f287' },
                { label: 'Teams', value: teams.length, color: '#7c5ce8' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-[#1c1c36] p-3 text-center">
                  <p className="text-xl font-black" style={{ color }}>{value}</p>
                  <p className="text-[11px] text-[#7878a8] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#7878a8] mb-1.5">
              Overall completion — {boardPct}% of all possible points earned across all teams
            </p>
            <div className="h-2 rounded-full bg-[#1c1c36] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(boardPct, 0)}%`, background: 'linear-gradient(90deg, #7c5ce8, #c89b3c)' }}
              />
            </div>
          </div>
        </div>

        {/* Right: live feed */}
        <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] p-4 self-start xl:sticky xl:top-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#57f287] animate-pulse shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#e8e8f0]">Live Feed</h2>
            <span className="ml-auto text-[10px] text-[#7878a8]">Approved drops</span>
          </div>

          {approvedFeed.length === 0 ? (
            <p className="text-sm text-[#7878a8] text-center py-8">No approved drops yet.</p>
          ) : (
            <ul className="divide-y divide-[#1c1c36]">
              {approvedFeed.slice(0, 15).map(sub => {
                const team = rsnToTeam.get(sub.rsn.toLowerCase())
                const task = taskMap.get(sub.task_id)
                return (
                  <li key={sub.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-1 self-stretch rounded-full mt-0.5 shrink-0 min-h-[2.5rem]"
                        style={{ backgroundColor: team?.color ?? '#2c2c4e' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#e8e8f0] truncate">{sub.rsn}</p>
                          {task && (
                            <span className="text-xs font-bold text-[#c89b3c] shrink-0">
                              +{task.points}pt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6868a0] truncate mt-0.5">{task?.title ?? '—'}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {team && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${team.color}20`, color: team.color }}
                            >
                              {team.name}
                            </span>
                          )}
                          <span className="text-[10px] text-[#7878a8]">
                            <ClientDate iso={sub.submitted_at} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
