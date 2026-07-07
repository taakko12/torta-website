'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClientDate } from './ClientDate'

// ── Serializable types (no Sets, no Maps) ─────────────────────────────────────

type Task = {
  id: string; position: number; title: string; description: string | null
  image_url: string | null; points: number; required_count: number
  points_per_submission: number | null
}
type Submission = {
  id: string; task_id: string; rsn: string
  screenshot_url: string | null; notes: string | null; submitted_at: string
}
type TeamProg = {
  team: { id: string; name: string; color: string }
  taskProgress: Record<string, number>
  completedTaskIds: string[]
  totalPoints: number
  members: string[]
}
type RsnTeamMap = Record<string, { name: string; color: string }>
type ViewMode = 'board' | 'heatmap' | 'miniboards' | 'tilelist'
type StatusFilter = 'all' | 'completed' | 'in_progress' | 'not_started'

interface Props {
  boardSize: number
  tasks: Task[]
  defaultTeamId: string | undefined
  allProgress: TeamProg[]
  submissions: Submission[]
  rsnTeamMap: RsnTeamMap
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tileStatus(task: Task, prog: TeamProg | null): Exclude<StatusFilter, 'all'> {
  if (!prog) return 'not_started'
  if (prog.completedTaskIds.includes(task.id)) return 'completed'
  if ((prog.taskProgress[task.id] ?? 0) > 0) return 'in_progress'
  return 'not_started'
}

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'All', completed: 'Completed', in_progress: 'In Progress', not_started: 'Not Started',
}
const STATUS_PILL: Record<Exclude<StatusFilter, 'all'>, string> = {
  completed: 'bg-[#57f287]/15 text-[#57f287] border border-[#57f287]/20',
  in_progress: 'bg-[#c89b3c]/15 text-[#c89b3c] border border-[#c89b3c]/20',
  not_started: 'bg-[#21213c] text-[#6868a0] border border-[#2c2c4e]',
}

const VIEWS: { key: ViewMode; label: string; sub: string; icon: string }[] = [
  { key: 'board', label: 'Team Board', sub: "One team's full board", icon: '⊞' },
  { key: 'heatmap', label: 'Heatmap', sub: "Compare all teams' tiles", icon: '◫' },
  { key: 'miniboards', label: 'Mini Boards', sub: "Every team's board at once", icon: '⊟' },
  { key: 'tilelist', label: 'Tile List', sub: 'All tiles + requirements', icon: '≡' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function BingoBoardView({
  boardSize, tasks, defaultTeamId, allProgress, submissions, rsnTeamMap,
}: Props) {
  const [view, setView] = useState<ViewMode>('board')
  const [activeTeamId, setActiveTeamId] = useState<string | undefined>(defaultTeamId)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const sortedProgress = [...allProgress].sort((a, b) => b.totalPoints - a.totalPoints)
  const activeProg = allProgress.find(p => p.team.id === activeTeamId) ?? allProgress[0] ?? null
  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position)
  const totalPossible = tasks.reduce((s, t) => s + t.points, 0)

  const closeModal = useCallback(() => setSelectedTask(null), [])

  useEffect(() => {
    if (!selectedTask) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [selectedTask, closeModal])

  const teamColor = activeProg?.team.color ?? '#c89b3c'
  const modalSubs = selectedTask ? submissions.filter(s => s.task_id === selectedTask.id) : []
  const modalCount = selectedTask ? (activeProg?.taskProgress[selectedTask.id] ?? 0) : 0
  const modalDone = selectedTask ? (activeProg?.completedTaskIds.includes(selectedTask.id) ?? false) : false
  const modalPct = selectedTask ? Math.min(100, Math.round((modalCount / selectedTask.required_count) * 100)) : 0

  const filteredTasks = statusFilter === 'all'
    ? sortedTasks
    : sortedTasks.filter(t => tileStatus(t, activeProg) === statusFilter)

  return (
    <div>
      {/* ── View tabs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              view === v.key
                ? 'border-[#c89b3c]/50 bg-[#c89b3c]/8'
                : 'border-[#2c2c4e] bg-[#161628] hover:border-[#424268] hover:bg-[#1c1c36]'
            }`}
          >
            <span className={`text-lg leading-none mt-0.5 shrink-0 ${view === v.key ? 'text-[#c89b3c]' : 'text-[#4a4a70]'}`}>
              {v.icon}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${view === v.key ? 'text-[#c89b3c]' : 'text-[#e8e8f0]'}`}>{v.label}</p>
              <p className="text-[10px] text-[#4a4a70] mt-0.5 leading-tight">{v.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Team selector (board + tilelist) ── */}
      {(view === 'board' || view === 'tilelist') && allProgress.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {sortedProgress.map(p => (
            <button
              key={p.team.id}
              onClick={() => setActiveTeamId(p.team.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                activeProg?.team.id === p.team.id
                  ? 'text-[#0f0f1e] border-transparent'
                  : 'bg-[#1c1c36] text-[#a0a0c0] border-[#333358] hover:text-[#e8e8f0]'
              }`}
              style={activeProg?.team.id === p.team.id ? { backgroundColor: p.team.color, borderColor: p.team.color } : {}}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.team.color }} />
              {p.team.name}
              <span className="opacity-60 text-xs">· {p.totalPoints}pts</span>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TEAM BOARD VIEW
          ═══════════════════════════════════════════ */}
      {view === 'board' && (
        <>
          {activeProg && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeProg.team.color }} />
                <span className="text-base font-bold text-white">{activeProg.team.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#6868a0]">{activeProg.completedTaskIds.length}/{tasks.length} Tiles</span>
                <span className="font-bold" style={{ color: activeProg.team.color }}>
                  {activeProg.totalPoints.toLocaleString()} pts
                </span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {sortedTasks.map(task => {
              const count = activeProg?.taskProgress[task.id] ?? 0
              const done = activeProg?.completedTaskIds.includes(task.id) ?? false
              const pct = Math.min(100, Math.round((count / task.required_count) * 100))
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex items-stretch rounded-xl border-2 overflow-hidden text-left group hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-[#c89b3c]/40"
                  style={{ borderColor: done ? teamColor : '#333358' }}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 shrink-0 bg-[#121226] overflow-hidden">
                    {task.image_url
                      ? <img src={task.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" /> // eslint-disable-line @next/next/no-img-element
                      : <div className="w-full h-full flex items-center justify-center text-[#21213c] text-2xl">□</div>
                    }
                    {done && <div className="absolute inset-0 opacity-25" style={{ backgroundColor: teamColor }} />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 bg-[#161628] p-2.5 flex flex-col justify-between min-w-0">
                    <div className="flex items-start gap-1">
                      <p className="text-xs font-bold text-white leading-tight line-clamp-2 flex-1">{task.title}</p>
                      {done && <span className="text-sm shrink-0 ml-1" style={{ color: teamColor }}>✓</span>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold" style={{ color: done ? teamColor : '#6868a0' }}>
                          {task.points}pts
                        </span>
                        <span className="text-[10px] text-[#4a4a70]">{count}/{task.required_count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#21213c] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: teamColor }} />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          HEATMAP VIEW
          ═══════════════════════════════════════════ */}
      {view === 'heatmap' && (
        <div className="overflow-x-auto rounded-xl border border-[#2c2c4e] bg-[#161628]">
          <table className="border-collapse" style={{ minWidth: `${200 + sortedTasks.length * 34}px`, width: '100%' }}>
            <thead>
              <tr className="border-b border-[#21213c]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70] sticky left-0 bg-[#161628] z-10 w-44">
                  Team
                </th>
                {sortedTasks.map(t => (
                  <th key={t.id} className="px-0.5 py-2 w-8" title={`#${t.position} — ${t.title}`}>
                    <div className="flex items-center justify-center">
                      {t.image_url
                        ? <img src={t.image_url} alt={t.title} className="w-6 h-6 rounded object-cover opacity-50 hover:opacity-100 transition-opacity" /> // eslint-disable-line @next/next/no-img-element
                        : <span className="text-[9px] font-mono text-[#424268]">{t.position}</span>
                      }
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Score</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Tiles</th>
              </tr>
            </thead>
            <tbody>
              {sortedProgress.map((p, i) => (
                <tr key={p.team.id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/40 transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-[#161628] z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#424268] w-4 shrink-0">#{i + 1}</span>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.team.color }} />
                      <span className="text-sm font-semibold text-[#e8e8f0] truncate max-w-[6rem]">{p.team.name}</span>
                    </div>
                  </td>
                  {sortedTasks.map(t => {
                    const done = p.completedTaskIds.includes(t.id)
                    const inProg = !done && (p.taskProgress[t.id] ?? 0) > 0
                    const cnt = p.taskProgress[t.id] ?? 0
                    return (
                      <td
                        key={t.id}
                        className="px-0.5 py-3"
                        title={done ? `✓ ${t.title}` : inProg ? `${cnt}/${t.required_count} — ${t.title}` : t.title}
                      >
                        <div className="flex items-center justify-center">
                          <div
                            className="w-3.5 h-3.5 rounded-full transition-all"
                            style={
                              done
                                ? { backgroundColor: p.team.color, boxShadow: `0 0 5px ${p.team.color}90` }
                                : inProg
                                  ? { backgroundColor: `${p.team.color}35`, border: `1.5px solid ${p.team.color}80` }
                                  : { border: '1.5px solid #333358' }
                            }
                          />
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold" style={{ color: p.team.color }}>
                      {p.totalPoints.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.completedTaskIds.length === tasks.length
                        ? 'bg-[#57f287]/15 text-[#57f287]'
                        : 'bg-[#21213c] text-[#6868a0]'
                    }`}>
                      {p.completedTaskIds.length}/{tasks.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MINI BOARDS VIEW
          ═══════════════════════════════════════════ */}
      {view === 'miniboards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProgress.map((p, i) => {
            const pct = totalPossible > 0 ? Math.round((p.totalPoints / totalPossible) * 100) : 0
            return (
              <div key={p.team.id} className="rounded-xl border bg-[#161628] overflow-hidden" style={{ borderColor: `${p.team.color}35` }}>
                {/* Header */}
                <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${p.team.color}25` }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-[#4a4a70] shrink-0">#{i + 1}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.team.color }} />
                    <span className="text-sm font-bold text-white truncate">{p.team.name}</span>
                  </div>
                  <div className="shrink-0 ml-2">
                    <span className="text-sm font-black" style={{ color: p.team.color }}>{p.totalPoints.toLocaleString()}</span>
                    <span className="text-[10px] text-[#4a4a70] ml-0.5">pt</span>
                  </div>
                </div>
                {/* Mini grid */}
                <div className="p-2" style={{ display: 'grid', gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`, gap: 3 }}>
                  {Array.from({ length: boardSize * boardSize }).map((_, pos) => {
                    const task = tasks.find(t => t.position === pos)
                    if (!task) return <div key={pos} className="aspect-square rounded-sm bg-[#121226]" />
                    const done = p.completedTaskIds.includes(task.id)
                    const inProg = !done && (p.taskProgress[task.id] ?? 0) > 0
                    return (
                      <button
                        key={task.id}
                        onClick={() => { setActiveTeamId(p.team.id); setSelectedTask(task) }}
                        title={task.title}
                        className="aspect-square rounded-sm relative overflow-hidden transition-all hover:scale-110 hover:z-10 focus:outline-none"
                      >
                        <div
                          className="absolute inset-0"
                          style={{ backgroundColor: done ? p.team.color : '#121226' }}
                        />
                        {task.image_url && (
                          <img // eslint-disable-line @next/next/no-img-element
                            src={task.image_url} alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                              opacity: done ? 0.8 : inProg ? 0.3 : 0.18,
                              mixBlendMode: done ? 'normal' : 'luminosity',
                            }}
                          />
                        )}
                        {inProg && (
                          <div className="absolute inset-0 rounded-sm" style={{ border: `1.5px solid ${p.team.color}70` }} />
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Footer bar */}
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between text-[10px] text-[#4a4a70] mb-1">
                    <span>{p.completedTaskIds.length}/{tasks.length} tiles</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-[#1c1c36] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.team.color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TILE LIST VIEW
          ═══════════════════════════════════════════ */}
      {view === 'tilelist' && (
        <div>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['all', 'completed', 'in_progress', 'not_started'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f
                    ? 'bg-[#7c5ce8]/20 text-[#c89b3c] border border-[#7c5ce8]/40'
                    : 'bg-[#1c1c36] text-[#6868a0] border border-[#2c2c4e] hover:text-[#e8e8f0]'
                }`}
              >
                {STATUS_LABEL[f]}
                {f !== 'all' && (
                  <span className="ml-1.5 opacity-50">
                    ({sortedTasks.filter(t => tileStatus(t, activeProg) === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] overflow-hidden">
            {/* Column headers */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: 720 }}>
                <div
                  className="grid px-4 py-2.5 border-b border-[#21213c] text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]"
                  style={{ gridTemplateColumns: '2.5rem 3rem 1fr 5rem 3rem 11rem 7rem 2.5rem', gap: '1rem' }}
                >
                  <span>#</span>
                  <span>Image</span>
                  <span>Tile Name</span>
                  <span>Points</span>
                  <span className="text-center">Goal</span>
                  <span>Progress</span>
                  <span>Status</span>
                  <span />
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="py-14 text-center text-sm text-[#4a4a70]">No tasks match this filter.</div>
                ) : (
                  filteredTasks.map(t => {
                    const count = activeProg?.taskProgress[t.id] ?? 0
                    const status = tileStatus(t, activeProg)
                    const pct = Math.min(100, Math.round((count / t.required_count) * 100))
                    const barColor = status === 'completed' ? teamColor : '#7c5ce8'
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="w-full grid px-4 py-3 border-b border-[#1c1c36] last:border-0 items-center hover:bg-[#1c1c36]/60 transition-colors text-left group"
                        style={{ gridTemplateColumns: '2.5rem 3rem 1fr 5rem 3rem 11rem 7rem 2.5rem', gap: '1rem' }}
                      >
                        <span className="text-xs font-mono text-[#4a4a70]">#{t.position}</span>

                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#121226] shrink-0">
                          {t.image_url
                            ? <img src={t.image_url} alt="" className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                            : <div className="w-full h-full flex items-center justify-center text-[#21213c] text-xl">□</div>
                          }
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#e8e8f0] truncate">{t.title}</p>
                          {t.description && (
                            <p className="text-[11px] text-[#6868a0] truncate mt-0.5">{t.description}</p>
                          )}
                        </div>

                        <div>
                          <span className="text-lg font-black" style={{ color: status === 'completed' ? teamColor : '#c89b3c' }}>
                            {t.points}
                          </span>
                          <span className="text-[10px] text-[#4a4a70] ml-0.5">pts</span>
                        </div>

                        <span className="text-sm text-[#6868a0] text-center font-semibold">{t.required_count}</span>

                        <div>
                          <div className="flex items-center justify-between text-[10px] text-[#4a4a70] mb-1">
                            <span>Progress</span>
                            <span className="font-bold text-[#e8e8f0]">{count} / {t.required_count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#1c1c36] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-center ${STATUS_PILL[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>

                        <div className="flex items-center justify-center">
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4a4a70] group-hover:text-[#c89b3c] group-hover:bg-[#c89b3c]/10 transition-all text-sm">
                            👁
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TASK DETAIL MODAL (shared across views)
          ═══════════════════════════════════════════ */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <div
            role="dialog" aria-modal="true"
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#333358] bg-[#161628] shadow-2xl shadow-black/60"
            onClick={e => e.stopPropagation()}
          >
            {/* Image banner */}
            {selectedTask.image_url && (
              <div className="relative bg-[#0f0f1e] overflow-hidden" style={{ height: 210 }}>
                <img src={selectedTask.image_url} alt={selectedTask.title} className="w-full h-full object-contain" /> {/* eslint-disable-line @next/next/no-img-element */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#161628]" />
              </div>
            )}

            <div className="p-5">
              {/* Title + close */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70] mb-1">Tile requirements and progress</p>
                  <h2 className="text-xl font-black text-white leading-snug">{selectedTask.title}</h2>
                </div>
                <button
                  onClick={closeModal}
                  className="w-7 h-7 rounded-full bg-[#21213c] text-[#6868a0] hover:text-white hover:bg-[#2c2c4e] transition-colors flex items-center justify-center text-sm shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Points + Grid Position */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-[#1c1c36] border border-[#21213c] p-3.5">
                  <p className="text-[10px] font-semibold text-[#6868a0] uppercase tracking-widest mb-1">Points</p>
                  <p className="text-3xl font-black" style={{ color: teamColor }}>{selectedTask.points}</p>
                </div>
                <div className="rounded-xl bg-[#1c1c36] border border-[#21213c] p-3.5">
                  <p className="text-[10px] font-semibold text-[#6868a0] uppercase tracking-widest mb-1">Grid Position</p>
                  <p className="text-3xl font-black text-[#e8e8f0]">#{selectedTask.position}</p>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div className="rounded-xl bg-[#1c1c36] border border-[#21213c] p-4 mb-4">
                  <p className="text-[10px] font-semibold text-[#6868a0] uppercase tracking-widest mb-1.5">Description</p>
                  <p className="text-sm text-[#b0b0c8] leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              {/* Progress */}
              <div className="rounded-xl bg-[#1c1c36] border border-[#21213c] p-4 mb-4">
                <p className="text-[10px] font-semibold text-[#6868a0] uppercase tracking-widest mb-3">Progress</p>
                {activeProg ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeProg.team.color }} />
                        <span className="text-xs font-semibold text-[#e8e8f0]">{activeProg.team.name}</span>
                      </div>
                      <span className="text-sm font-bold text-[#e8e8f0]">{modalCount} / {selectedTask.required_count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#161628] overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${modalPct}%`,
                          background: `linear-gradient(90deg, ${activeProg.team.color}70, ${activeProg.team.color})`,
                          boxShadow: modalDone ? `0 0 8px ${activeProg.team.color}60` : undefined,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        modalDone
                          ? 'bg-[#57f287]/15 text-[#57f287] border border-[#57f287]/20'
                          : modalCount > 0
                            ? 'bg-[#c89b3c]/15 text-[#c89b3c] border border-[#c89b3c]/20'
                            : 'bg-[#21213c] text-[#6868a0] border border-[#2c2c4e]'
                      }`}>
                        {modalDone ? '✓ Completed' : modalCount > 0 ? 'In Progress' : 'Not Started'}
                      </span>
                      {selectedTask.points_per_submission && (
                        <span className="text-[10px] text-[#4a4a70]">
                          +{selectedTask.points_per_submission}pt per submission
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#4a4a70]">No team selected.</p>
                )}
              </div>

              {/* Submissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#6868a0]">Approved Submissions</p>
                  <span className="text-[10px] text-[#4a4a70]">{modalSubs.length}</span>
                </div>
                {modalSubs.length === 0 ? (
                  <div className="rounded-xl border border-[#21213c] bg-[#121226] py-8 text-center">
                    <p className="text-sm text-[#4a4a70]">No approved submissions yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {modalSubs.map(sub => {
                      const team = rsnTeamMap[sub.rsn.toLowerCase()]
                      return (
                        <li key={sub.id} className="rounded-xl border border-[#21213c] bg-[#121226] overflow-hidden">
                          {sub.screenshot_url && (
                            <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer">
                              <img // eslint-disable-line @next/next/no-img-element
                                src={sub.screenshot_url} alt={`${sub.rsn} screenshot`}
                                className="w-full object-cover hover:opacity-90 transition-opacity bg-[#0f0f1e]"
                                style={{ maxHeight: 220 }}
                              />
                            </a>
                          )}
                          <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
                            {team && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: team.color }} />}
                            <span className="text-sm font-semibold text-[#e8e8f0]">{sub.rsn}</span>
                            {team && (
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${team.color}20`, color: team.color }}
                              >
                                {team.name}
                              </span>
                            )}
                            <span className="text-[10px] text-[#4a4a70] ml-auto">
                              <ClientDate iso={sub.submitted_at} />
                            </span>
                          </div>
                          {sub.notes && (
                            <p className="text-xs text-[#6868a0] italic px-3 pb-2.5">"{sub.notes}"</p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
