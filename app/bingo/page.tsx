import Link from 'next/link'
import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getApprovedSubmissions, computeTeamProgress,
} from '@/lib/bingo'
import { getServerSession } from '@/lib/auth'

export const revalidate = 15

type Props = { searchParams: Promise<{ team?: string }> }

export default async function BingoPage({ searchParams }: Props) {
  const { team: selectedTeamId } = await searchParams
  const [event, session] = await Promise.all([getActiveEvent(), getServerSession()])

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-[#c89b3c] text-xl font-bold uppercase tracking-widest mb-2">No Active Bingo</p>
        <p className="text-sm text-[#7070a0]">Check back when the next event is live.</p>
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

  const activeTeam = progress.find(p => p.team.id === selectedTeamId) ?? progress[0]
  const totalCells = event.board_size * event.board_size
  const totalPossible = tasks.reduce((s, t) => s + t.points, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#c89b3c] uppercase tracking-widest">{event.title}</h1>
          <p className="text-xs text-[#7070a0] mt-1">{event.board_size}×{event.board_size} board · {tasks.length} tasks</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/bingo/submit"
            className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060] transition-colors"
          >
            Submit Drop
          </Link>
          {session?.isAdmin && (
            <Link
              href="/bingo/admin"
              className="text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors"
            >
              ⚙ Manage Board
            </Link>
          )}
        </div>
      </div>

      {/* Team tabs */}
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {progress.map(p => (
            <Link
              key={p.team.id}
              href={`/bingo?team=${p.team.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                (activeTeam?.team.id === p.team.id)
                  ? 'text-[#07070f] border-transparent'
                  : 'bg-[#141427] text-[#a0a0c0] border-[#2a2a4a] hover:text-[#e8e8f0]'
              }`}
              style={(activeTeam?.team.id === p.team.id) ? { backgroundColor: p.team.color, borderColor: p.team.color } : {}}
            >
              {p.team.name} · {p.totalPoints}pts
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Board grid */}
        <div className="flex-1 min-w-0">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${event.board_size}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalCells }).map((_, i) => {
              const task = tasks.find(t => t.position === i)
              if (!task) {
                return <div key={i} className="aspect-square rounded-lg bg-[#0a0a18] border border-[#1a1a30]" />
              }
              const count = activeTeam?.taskProgress[task.id] ?? 0
              const done = activeTeam?.completedTasks.has(task.id) ?? false
              const pct = Math.min(100, Math.round((count / task.required_count) * 100))

              const teamColor = activeTeam?.team.color ?? '#c89b3c'
              return (
                <div
                  key={task.id}
                  className={`aspect-square rounded-xl border-2 relative overflow-hidden transition-all`}
                  style={{ borderColor: done ? teamColor : '#2a2a4a' }}
                >
                  {/* Background */}
                  <div className="absolute inset-0 bg-[#0d0d1e]" />
                  {task.image_url && (
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={task.image_url} alt="" className="w-full h-full object-contain opacity-40" />
                    </div>
                  )}
                  {/* Gradient overlay so text is always readable */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07070f]/95 via-[#07070f]/30 to-transparent" />
                  {/* Done tint */}
                  {done && <div className="absolute inset-0 opacity-10 transition-all" style={{ backgroundColor: teamColor }} />}

                  {/* Content pinned to bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-white leading-tight line-clamp-2 drop-shadow">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#9090b0]">{count}/{task.required_count}</span>
                      <span className="text-[11px] font-bold" style={{ color: teamColor }}>
                        {task.points}pt{task.points !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1a1a30] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: teamColor }} />
                    </div>
                  </div>

                  {done && (
                    <div className="absolute top-2 right-2 text-base leading-none" style={{ color: teamColor }}>✓</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="xl:w-64 shrink-0">
          <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Leaderboard</h2>
              <span className="text-xs text-[#7070a0]">{totalPossible} pts total</span>
            </div>
            {sorted.length === 0 ? (
              <p className="text-xs text-[#7070a0]">No teams yet.</p>
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
                            : <span className="text-xs text-[#7070a0] w-4 text-right shrink-0">{i + 1}</span>
                          }
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.team.color }} />
                          <span className="text-sm font-semibold text-[#e8e8f0] truncate">{p.team.name}</span>
                        </div>
                        <span className="text-xs font-bold shrink-0 ml-2" style={{ color: p.team.color }}>
                          {p.totalPoints}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-[#141427] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: p.team.color }}
                        />
                      </div>
                      <p className="text-[11px] text-[#7070a0] mt-1">
                        {pct}% · {p.completedTasks.size}/{tasks.length} tiles
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {activeTeam && (
            <div className="mt-4 rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: activeTeam.team.color }}>
                {activeTeam.team.name}
              </h2>
              <p className="text-xs text-[#7070a0] mb-2">Members</p>
              {activeTeam.members.length === 0 ? (
                <p className="text-xs text-[#7070a0] italic">None assigned</p>
              ) : (
                <ul className="space-y-1">
                  {activeTeam.members.map(rsn => (
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
