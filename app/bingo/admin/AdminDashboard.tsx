'use client'

import { useState, useEffect, useCallback } from 'react'

type BingoEvent = { id: string; title: string; board_size: number; active: boolean; created_at: string }
type BingoTask = { id: string; position: number; title: string; description: string | null; image_url: string | null; points: number; required_count: number }
type BingoTeam = { id: string; name: string; color: string }
type BingoMember = { id: string; team_id: string; rsn: string }
type BingoSub = { id: string; task_id: string; rsn: string; screenshot_url: string | null; notes: string | null; status: string; submitted_at: string }

const TEAM_COLORS = ['#c89b3c', '#5865F2', '#57F287', '#ED4245', '#FEE75C', '#EB459E', '#3498db']

async function api(action: string, extra: object = {}) {
  const res = await fetch('/api/bingo/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json
}

async function review(submissionId: string, action: 'approved' | 'rejected') {
  await fetch('/api/bingo/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, action }),
  })
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<'events' | 'tasks' | 'teams' | 'queue'>('events')
  const [events, setEvents] = useState<BingoEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BingoTask[]>([])
  const [teams, setTeams] = useState<BingoTeam[]>([])
  const [members, setMembers] = useState<BingoMember[]>([])
  const [subs, setSubs] = useState<BingoSub[]>([])

  // Forms
  const [newTitle, setNewTitle] = useState('')
  const [newSize, setNewSize] = useState(5)
  const [taskForm, setTaskForm] = useState({ id: '', position: 0, title: '', description: '', image_url: '', points: 1, required_count: 1 })
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0])
  const [memberRsn, setMemberRsn] = useState('')
  const [memberTeamId, setMemberTeamId] = useState('')

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const load = useCallback(async () => {
    const res = await fetch('/api/bingo/active-event')
    const { event } = await res.json()
    const allRes = await fetch('/api/bingo/events')
    const allData = await allRes.json()
    setEvents(allData.events ?? [])
    if (!selectedEventId && event) setSelectedEventId(event.id)
  }, [selectedEventId])

  const loadEventData = useCallback(async (eventId: string) => {
    const [tasksRes, teamsRes, subsRes] = await Promise.all([
      fetch(`/api/bingo/events/${eventId}/tasks`),
      fetch(`/api/bingo/events/${eventId}/teams`),
      fetch(`/api/bingo/events/${eventId}/submissions?status=pending`),
    ])
    const [{ tasks: t }, { teams: tm, members: m }, { submissions: s }] = await Promise.all([
      tasksRes.json(), teamsRes.json(), subsRes.json(),
    ])
    setTasks(t ?? [])
    setTeams(tm ?? [])
    setMembers(m ?? [])
    setSubs(s ?? [])
    if (tm?.length && !memberTeamId) setMemberTeamId(tm[0].id)
  }, [memberTeamId])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (selectedEventId) loadEventData(selectedEventId) }, [selectedEventId, loadEventData])

  async function createEvent() {
    if (!newTitle.trim()) return
    try {
      await api('create_event', { title: newTitle.trim(), board_size: newSize })
      setNewTitle('')
      load()
    } catch (e) {
      alert(`Error: ${(e as Error).message}`)
    }
  }

  async function setActive(eventId: string | null) {
    await api('set_active', { event_id: eventId })
    load()
  }

  async function upsertTask() {
    if (!taskForm.title.trim() || !selectedEventId) return
    await api('upsert_task', { ...taskForm, event_id: selectedEventId })
    setTaskForm({ id: '', position: tasks.length, title: '', description: '', image_url: '', points: 1, required_count: 1 })
    if (selectedEventId) loadEventData(selectedEventId)
  }

  async function deleteTask(id: string) {
    await api('delete_task', { id })
    if (selectedEventId) loadEventData(selectedEventId)
  }

  async function createTeam() {
    if (!teamName.trim() || !selectedEventId) return
    await api('create_team', { event_id: selectedEventId, name: teamName.trim(), color: teamColor })
    setTeamName('')
    if (selectedEventId) loadEventData(selectedEventId)
  }

  async function deleteTeam(id: string) {
    await api('delete_team', { id })
    if (selectedEventId) loadEventData(selectedEventId)
  }

  async function addMember() {
    if (!memberRsn.trim() || !memberTeamId) return
    await api('add_member', { team_id: memberTeamId, rsn: memberRsn.trim() })
    setMemberRsn('')
    if (selectedEventId) loadEventData(selectedEventId)
  }

  async function removeMember(id: string) {
    await api('remove_member', { id })
    if (selectedEventId) loadEventData(selectedEventId)
  }

  async function doReview(subId: string, action: 'approved' | 'rejected') {
    await review(subId, action)
    setSubs(s => s.filter(x => x.id !== subId))
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'events', label: 'Events' },
    { key: 'tasks', label: `Tasks (${tasks.length})` },
    { key: 'teams', label: `Teams (${teams.length})` },
    { key: 'queue', label: `Queue (${subs.length})` },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#c89b3c] uppercase tracking-widest">Bingo Admin</h1>
        {events.length > 0 && (
          <select
            value={selectedEventId ?? ''}
            onChange={e => setSelectedEventId(e.target.value || null)}
            className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-1.5 text-sm outline-none"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title} {ev.active ? '(active)' : ''}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[#2a2a4a]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#c89b3c] text-[#c89b3c]'
                : 'border-transparent text-[#7070a0] hover:text-[#e8e8f0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* EVENTS TAB */}
      {tab === 'events' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Create Event</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Event title"
                className="flex-1 min-w-48 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#7070a0]">Size</label>
                <input
                  type="number" min={3} max={10} value={newSize}
                  onChange={e => setNewSize(Number(e.target.value))}
                  className="w-16 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none"
                />
              </div>
              <button onClick={createEvent}
                className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060] transition-colors">
                Create
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">All Events</h2>
            {events.length === 0 ? (
              <p className="text-sm text-[#7070a0]">No events yet.</p>
            ) : (
              <ul className="divide-y divide-[#2a2a4a]">
                {events.map(ev => (
                  <li key={ev.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#e8e8f0]">{ev.title}</p>
                      <p className="text-xs text-[#7070a0]">{ev.board_size}×{ev.board_size}</p>
                    </div>
                    <div className="flex gap-2">
                      {ev.active ? (
                        <button onClick={() => setActive(null)}
                          className="text-xs px-3 py-1 rounded bg-green-900/40 text-green-400 border border-green-800 hover:bg-green-900/60">
                          Active ✓
                        </button>
                      ) : (
                        <button onClick={() => setActive(ev.id)}
                          className="text-xs px-3 py-1 rounded bg-[#141427] text-[#7070a0] border border-[#2a2a4a] hover:text-[#e8e8f0]">
                          Set Active
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {tab === 'tasks' && (
        <div className="space-y-6">
          {!selectedEventId ? (
            <p className="text-sm text-[#7070a0]">Select an event above.</p>
          ) : (
            <>
              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">
                  {taskForm.id ? 'Edit Task' : 'Add Task'}
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <label className="text-xs text-[#7070a0] mb-1 block">Title</label>
                    <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Get 5 sapphires from Giant Mole"
                      className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-[#7070a0] mb-1 block">Description (optional)</label>
                    <input value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Additional context…"
                      className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-[#7070a0] mb-1 block">Image URL (optional)</label>
                    <input value={taskForm.image_url} onChange={e => setTaskForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://…"
                      className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#7070a0] mb-1 block">Grid position (0-indexed)</label>
                    <input type="number" min={0} max={selectedEvent ? selectedEvent.board_size ** 2 - 1 : 99}
                      value={taskForm.position} onChange={e => setTaskForm(f => ({ ...f, position: Number(e.target.value) }))}
                      className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-[#7070a0] mb-1 block">Points</label>
                    <input type="number" min={1} value={taskForm.points}
                      onChange={e => setTaskForm(f => ({ ...f, points: Number(e.target.value) }))}
                      className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-[#7070a0] mb-1 block">Required submissions</label>
                    <input type="number" min={1} value={taskForm.required_count}
                      onChange={e => setTaskForm(f => ({ ...f, required_count: Number(e.target.value) }))}
                      className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={upsertTask}
                    className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060] transition-colors">
                    {taskForm.id ? 'Save' : 'Add Task'}
                  </button>
                  {taskForm.id && (
                    <button onClick={() => setTaskForm({ id: '', position: tasks.length, title: '', description: '', image_url: '', points: 1, required_count: 1 })}
                      className="px-4 py-2 rounded-lg bg-[#141427] text-[#7070a0] text-sm border border-[#2a2a4a] hover:text-[#e8e8f0]">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Tasks</h2>
                {tasks.length === 0 ? (
                  <p className="text-sm text-[#7070a0]">No tasks yet.</p>
                ) : (
                  <ul className="divide-y divide-[#2a2a4a]">
                    {tasks.map(t => (
                      <li key={t.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[#e8e8f0]">
                            <span className="text-[#7070a0] text-xs mr-2">#{t.position}</span>
                            {t.title}
                          </p>
                          <p className="text-xs text-[#7070a0]">{t.points}pt · ×{t.required_count}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setTaskForm({ id: t.id, position: t.position, title: t.title, description: t.description ?? '', image_url: t.image_url ?? '', points: t.points, required_count: t.required_count })}
                            className="text-xs px-2 py-1 rounded bg-[#141427] text-[#7070a0] border border-[#2a2a4a] hover:text-[#e8e8f0]">
                            Edit
                          </button>
                          <button onClick={() => deleteTask(t.id)}
                            className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50">
                            Del
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TEAMS TAB */}
      {tab === 'teams' && (
        <div className="space-y-6">
          {!selectedEventId ? (
            <p className="text-sm text-[#7070a0]">Select an event above.</p>
          ) : (
            <>
              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Create Team</h2>
                <div className="flex gap-2 flex-wrap">
                  <input value={teamName} onChange={e => setTeamName(e.target.value)}
                    placeholder="Team name"
                    className="flex-1 min-w-40 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]" />
                  <div className="flex gap-1">
                    {TEAM_COLORS.map(c => (
                      <button key={c} onClick={() => setTeamColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${teamColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <button onClick={createTeam}
                    className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060]">
                    Create
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Add Member</h2>
                <div className="flex gap-2 flex-wrap">
                  <select value={memberTeamId} onChange={e => setMemberTeamId(e.target.value)}
                    className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input value={memberRsn} onChange={e => setMemberRsn(e.target.value)}
                    placeholder="RSN"
                    className="flex-1 min-w-32 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]" />
                  <button onClick={addMember}
                    className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060]">
                    Add
                  </button>
                </div>
              </div>

              {teams.map(team => {
                const teamMembers = members.filter(m => m.team_id === team.id)
                return (
                  <div key={team.id} className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                        <span style={{ color: team.color }}>{team.name}</span>
                      </h3>
                      <button onClick={() => deleteTeam(team.id)}
                        className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50">
                        Delete team
                      </button>
                    </div>
                    {teamMembers.length === 0 ? (
                      <p className="text-xs text-[#7070a0]">No members yet.</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {teamMembers.map(m => (
                          <li key={m.id} className="flex items-center gap-1.5 bg-[#141427] rounded px-2 py-1 text-xs text-[#e8e8f0]">
                            {m.rsn}
                            <button onClick={() => removeMember(m.id)} className="text-[#7070a0] hover:text-red-400 ml-0.5">×</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* QUEUE TAB */}
      {tab === 'queue' && (
        <div className="space-y-4">
          {!selectedEventId ? (
            <p className="text-sm text-[#7070a0]">Select an event above.</p>
          ) : subs.length === 0 ? (
            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-8 text-center text-sm text-[#7070a0]">
              No pending submissions.
            </div>
          ) : (
            subs.map(sub => {
              const task = tasks.find(t => t.id === sub.task_id)
              return (
                <div key={sub.id} className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-[#e8e8f0]">{sub.rsn}</p>
                      <p className="text-xs text-[#c89b3c] mt-0.5">{task?.title ?? sub.task_id}</p>
                      {sub.notes && <p className="text-xs text-[#7070a0] mt-1 italic">"{sub.notes}"</p>}
                      <p className="text-xs text-[#7070a0] mt-1">{new Date(sub.submitted_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => doReview(sub.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-green-900/40 text-green-400 border border-green-800 text-sm font-medium hover:bg-green-900/60 transition-colors">
                        ✓ Approve
                      </button>
                      <button onClick={() => doReview(sub.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 border border-red-900/50 text-sm font-medium hover:bg-red-900/50 transition-colors">
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                  {sub.screenshot_url && (
                    <div className="mt-3">
                      <a href={sub.screenshot_url} target="_blank" rel="noreferrer"
                        className="text-xs text-[#5865F2] underline">View screenshot ↗</a>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sub.screenshot_url} alt="screenshot" className="mt-2 max-h-48 rounded-lg object-contain bg-[#141427]" />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
