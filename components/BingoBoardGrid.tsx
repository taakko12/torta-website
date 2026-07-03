'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClientDate } from './ClientDate'

type Task = {
  id: string; position: number; title: string; description: string | null
  image_url: string | null; points: number; required_count: number; points_per_submission: number | null
}

type Submission = {
  id: string; task_id: string; rsn: string
  screenshot_url: string | null; notes: string | null; submitted_at: string
}

type RsnTeamMap = Record<string, { name: string; color: string }>

type ActiveTeamProgress = {
  team: { id: string; name: string; color: string }
  taskProgress: Record<string, number>
  completedTaskIds: string[]
}

interface Props {
  boardSize: number
  tasks: Task[]
  activeTeam: ActiveTeamProgress | null
  submissions: Submission[]
  rsnTeamMap: RsnTeamMap
}

export default function BingoBoardGrid({ boardSize, tasks, activeTeam, submissions, rsnTeamMap }: Props) {
  const [selected, setSelected] = useState<Task | null>(null)

  const close = useCallback(() => setSelected(null), [])

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [selected, close])

  const teamColor = activeTeam?.team.color ?? '#c89b3c'
  const taskSubmissions = selected ? submissions.filter(s => s.task_id === selected.id) : []
  const activeCount = selected ? (activeTeam?.taskProgress[selected.id] ?? 0) : 0
  const activeDone = selected ? (activeTeam?.completedTaskIds.includes(selected.id) ?? false) : false
  const activePct = selected ? Math.min(100, Math.round((activeCount / selected.required_count) * 100)) : 0

  return (
    <>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: boardSize * boardSize }).map((_, i) => {
          const task = tasks.find(t => t.position === i)
          if (!task) {
            return <div key={i} className="aspect-square rounded-lg bg-[#0a0a18] border border-[#1a1a30]" />
          }
          const count = activeTeam?.taskProgress[task.id] ?? 0
          const done = activeTeam?.completedTaskIds.includes(task.id) ?? false
          const pct = Math.min(100, Math.round((count / task.required_count) * 100))

          return (
            <button
              key={task.id}
              onClick={() => setSelected(task)}
              className="aspect-square rounded-xl border-2 relative overflow-hidden transition-all text-left group hover:scale-[1.03] hover:z-10 focus:outline-none focus:ring-2 focus:ring-[#c89b3c]/50"
              style={{ borderColor: done ? teamColor : '#2a2a4a' }}
            >
              <div className="absolute inset-0 bg-[#0d0d1e]" />
              {task.image_url && (
                <div className="absolute inset-0 flex items-center justify-center p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={task.image_url} alt="" className="w-full h-full object-contain opacity-40 group-hover:opacity-55 transition-opacity" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#07070f]/95 via-[#07070f]/30 to-transparent" />
              {done && <div className="absolute inset-0 opacity-10" style={{ backgroundColor: teamColor }} />}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.025] transition-colors" />

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
            </button>
          )
        })}
      </div>

      {/* Task detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a2a4a] bg-[#0d0d1e] shadow-2xl shadow-black/60"
            onClick={e => e.stopPropagation()}
          >
            {/* Image banner */}
            {selected.image_url && (
              <div className="relative w-full bg-[#07070f] overflow-hidden" style={{ height: 200 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.image_url}
                  alt={selected.title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d0d1e]" />
              </div>
            )}

            <div className="p-5">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-1">
                <h2 className="flex-1 text-xl font-black text-white leading-snug">{selected.title}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg font-black" style={{ color: teamColor }}>
                    {selected.points}pt{selected.points !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={close}
                    className="w-7 h-7 rounded-full bg-[#1a1a30] text-[#6868a0] hover:text-white hover:bg-[#252540] transition-colors flex items-center justify-center text-sm leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {selected.description && (
                <p className="text-sm text-[#8888b0] leading-relaxed mb-4">{selected.description}</p>
              )}

              {/* Progress section */}
              {activeTeam && (
                <div className="rounded-xl bg-[#141427] border border-[#1a1a30] p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeTeam.team.color }} />
                      <span className="text-sm font-semibold text-[#e8e8f0]">{activeTeam.team.name}</span>
                      {activeDone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#57f287]/15 text-[#57f287] border border-[#57f287]/20">
                          ✓ Complete
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#6868a0]">{activeCount} / {selected.required_count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#0d0d1e] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${activePct}%`,
                        background: `linear-gradient(90deg, ${activeTeam.team.color}80, ${activeTeam.team.color})`,
                        boxShadow: activeDone ? `0 0 8px ${activeTeam.team.color}60` : undefined,
                      }}
                    />
                  </div>
                  {selected.points_per_submission && (
                    <p className="text-[10px] text-[#4a4a70] mt-1.5">
                      +{selected.points_per_submission}pt per submission · full tile = {selected.points}pt
                    </p>
                  )}
                </div>
              )}

              {/* Submissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#6868a0]">Submissions</p>
                  <span className="text-xs text-[#4a4a70]">{taskSubmissions.length} approved</span>
                </div>

                {taskSubmissions.length === 0 ? (
                  <div className="rounded-xl border border-[#1a1a30] bg-[#0a0a18] py-8 text-center">
                    <p className="text-sm text-[#4a4a70]">No approved submissions yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {taskSubmissions.map(sub => {
                      const team = rsnTeamMap[sub.rsn.toLowerCase()]
                      return (
                        <li key={sub.id} className="rounded-xl border border-[#1a1a30] bg-[#0a0a18] overflow-hidden">
                          {sub.screenshot_url && (
                            <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sub.screenshot_url}
                                alt={`${sub.rsn} screenshot`}
                                className="w-full object-cover hover:opacity-90 transition-opacity bg-[#07070f]"
                                style={{ maxHeight: 240 }}
                              />
                            </a>
                          )}
                          <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
                            {team && (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                            )}
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
    </>
  )
}
