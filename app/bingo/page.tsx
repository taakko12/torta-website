import Link from 'next/link'
import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getApprovedSubmissions, computeTeamProgress,
} from '@/lib/bingo'

export const revalidate = 15

type Props = { searchParams: Promise<{ team?: string }> }

export default async function BingoPage({ searchParams }: Props) {
  const { team: selectedTeamId } = await searchParams
  const event = await getActiveEvent()

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#c89b3c] uppercase tracking-widest">{event.title}</h1>
          <p className="text-xs text-[#7070a0] mt-1">{event.board_size}×{event.board_size} board · {tasks.length} tasks</p>
        </div>
        <Link
          href="/bingo/submit"
          className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060] transition-colors"
        >
          Submit Drop
        </Link>
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

              return (
                <div
                  key={task.id}
                  className={`aspect-square rounded-lg border flex flex-col overflow-hidden relative transition-all ${
                    done ? 'border-2' : 'border-[#2a2a4a] bg-[#0e0e1c]'
                  }`}
                  style={done ? { borderColor: activeTeam?.team.color, backgroundColor: activeTeam?.team.color + '18' } : {}}
                >
                  {task.image_url && (
                    <div className="w-full aspect-[4/3] overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={task.image_url} alt="" className="w-full h-full object-cover opacity-60" />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between p-1.5 gap-1 min-h-0">
                    <p className="text-[10px] leading-tight font-medium text-[#e8e8f0] line-clamp-3">{task.title}</p>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] text-[#7070a0]">{count}/{task.required_count}</span>
                        <span className="text-[9px] font-semibold" style={{ color: activeTeam?.team.color ?? '#c89b3c' }}>
                          {task.points}pt{task.points !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-[#1a1a30] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: activeTeam?.team.color ?? '#c89b3c' }}
                        />
                      </div>
                    </div>
                  </div>
                  {done && (
                    <div className="absolute top-1 right-1 text-[10px]">✓</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="xl:w-64 shrink-0">
          <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Leaderboard</h2>
            {sorted.length === 0 ? (
              <p className="text-xs text-[#7070a0]">No teams yet.</p>
            ) : (
              <ul className="space-y-3">
                {sorted.map((p, i) => (
                  <li key={p.team.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#7070a0] w-4 text-right shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.team.color }} />
                        <span className="text-sm font-medium text-[#e8e8f0] truncate">{p.team.name}</span>
                      </div>
                      <p className="text-xs text-[#7070a0]">
                        {p.totalPoints}pts · {p.completedTasks.size}/{tasks.length} tiles
                      </p>
                    </div>
                  </li>
                ))}
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
