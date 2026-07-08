'use client'
import { useState, useEffect, useCallback } from 'react'

type BingoEvent = { id: string; title: string; board_size: number; active: boolean; created_at: string; rules?: string | null; team_size?: number }
type BingoTask = { id: string; position: number; title: string; description: string | null; image_url: string | null; points: number; required_count: number; points_per_submission: number | null }
type BingoTeam = { id: string; name: string; color: string }
type BingoMember = { id: string; team_id: string; rsn: string }
type BingoSub = { id: string; task_id: string; rsn: string; screenshot_url: string | null; notes: string | null; status: string; submitted_at: string }
type Signup = { id: string; rsn: string; discord_username: string | null; expected_playtime: string | null; preferred_partner: string | null; notes: string | null; submitted_at: string }
type WomData = { displayName: string; type: string; ehp: number; ehb: number; totalLevel: number }

const TEAM_COLORS = ['#c89b3c', '#5865F2', '#57F287', '#ED4245', '#FEE75C', '#EB459E', '#3498db']
const EMPTY_TASK = { id: '', position: 0, title: '', description: '', image_url: '', points: 1, required_count: 1, points_per_submission: '' }

const ACCOUNT_BADGES: Record<string, { label: string; color: string }> = {
  ironman:          { label: 'IM',   color: '#a0a0b8' },
  hardcore_ironman: { label: 'HCIM', color: '#ED4245' },
  ultimate_ironman: { label: 'UIM',  color: '#b09cf8' },
  group_ironman:    { label: 'GIM',  color: '#57F287' },
  solo_ironman:     { label: 'SIM',  color: '#c89b3c' },
}

async function api(action: string, extra: object = {}) {
  const res = await fetch('/api/bingo/admin', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}: ${text}`)
  return json
}

async function review(submissionId: string, action: 'approved' | 'rejected') {
  await fetch('/api/bingo/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId, action }) })
}

export default function BingoPanel() {
  const [tab, setTab] = useState<'events' | 'tasks' | 'teams' | 'draft' | 'queue'>('events')
  const [events, setEvents] = useState<BingoEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BingoTask[]>([])
  const [teams, setTeams] = useState<BingoTeam[]>([])
  const [members, setMembers] = useState<BingoMember[]>([])
  const [subs, setSubs] = useState<BingoSub[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newSize, setNewSize] = useState(5)
  const [newTeamSize, setNewTeamSize] = useState(2)
  const [taskForm, setTaskForm] = useState(EMPTY_TASK)
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0])
  const [memberRsn, setMemberRsn] = useState('')
  const [memberTeamId, setMemberTeamId] = useState('')
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)

  // Event settings (rules + team_size)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [rulesText, setRulesText] = useState('')
  const [editTeamSize, setEditTeamSize] = useState(2)
  const [saveStatus, setSaveStatus] = useState('')

  // Draft tab
  const [signups, setSignups] = useState<Signup[]>([])
  const [womData, setWomData] = useState<Record<string, WomData>>({})
  const [womLoading, setWomLoading] = useState(false)
  const [dragRsns, setDragRsns] = useState<string[]>([])
  const [draftDropTarget, setDraftDropTarget] = useState<string | null>(null)

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const load = useCallback(async () => {
    const [activeRes, allRes] = await Promise.all([fetch('/api/bingo/active-event'), fetch('/api/bingo/events')])
    const { event } = await activeRes.json()
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
    setTasks(t ?? []); setTeams(tm ?? []); setMembers(m ?? []); setSubs(s ?? [])
    if (tm?.length && !memberTeamId) setMemberTeamId(tm[0].id)
  }, [memberTeamId])

  const loadDraftData = useCallback(async (eventId: string) => {
    const res = await fetch(`/api/bingo/signups?event_id=${eventId}`)
    const { signups: s } = await res.json()
    setSignups(s ?? [])
    if (s?.length) {
      setWomLoading(true)
      const rsns = (s as Signup[]).map((x: Signup) => x.rsn).join(',')
      const wom = await fetch(`/api/bingo/draft?rsns=${encodeURIComponent(rsns)}`).then(r => r.json()).catch(() => ({}))
      setWomData(wom)
      setWomLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (selectedEventId) loadEventData(selectedEventId) }, [selectedEventId, loadEventData])
  useEffect(() => { if (tab === 'draft' && selectedEventId) loadDraftData(selectedEventId) }, [tab, selectedEventId, loadDraftData])

  async function createEvent() {
    if (!newTitle.trim()) return
    try { await api('create_event', { title: newTitle.trim(), board_size: newSize, team_size: newTeamSize }); setNewTitle(''); load() }
    catch (e) { alert(`Error: ${(e as Error).message}`) }
  }

  async function setActive(eventId: string | null) { await api('set_active', { event_id: eventId }); load() }

  async function saveEventSettings(eventId: string) {
    await api('update_event', { id: eventId, rules: rulesText, team_size: editTeamSize })
    setSaveStatus('✅ Saved')
    setTimeout(() => setSaveStatus(''), 2000)
    load()
  }

  function openEventEdit(ev: BingoEvent) {
    if (editingEventId === ev.id) { setEditingEventId(null); return }
    setEditingEventId(ev.id)
    setRulesText(ev.rules ?? '')
    setEditTeamSize(ev.team_size ?? 2)
  }

  async function upsertTask() {
    if (!taskForm.title.trim() || !selectedEventId) return
    const pps = taskForm.points_per_submission ? Number(taskForm.points_per_submission) : null
    try { await api('upsert_task', { ...taskForm, event_id: selectedEventId, points_per_submission: pps }); setTaskForm({ ...EMPTY_TASK, position: tasks.length + 1 }); loadEventData(selectedEventId) }
    catch (e) { alert(`Error: ${(e as Error).message}`) }
  }

  async function deleteTask(id: string) { await api('delete_task', { id }); if (selectedEventId) loadEventData(selectedEventId) }

  async function moveTaskTo(taskId: string, newPos: number) {
    if (!selectedEventId) return
    const src = tasks.find(t => t.id === taskId)
    if (!src || src.position === newPos) { setDragTaskId(null); return }
    const occupant = tasks.find(t => t.position === newPos)
    try {
      if (occupant) {
        await api('swap_tasks', { id_a: taskId, id_b: occupant.id })
        if (taskForm.id === taskId) setTaskForm(f => ({ ...f, position: newPos }))
        if (taskForm.id === occupant.id) setTaskForm(f => ({ ...f, position: src.position }))
      } else {
        await api('upsert_task', { id: src.id, event_id: selectedEventId, position: newPos, title: src.title, description: src.description, image_url: src.image_url, points: src.points, required_count: src.required_count, points_per_submission: src.points_per_submission })
        if (taskForm.id === taskId) setTaskForm(f => ({ ...f, position: newPos }))
      }
    } catch (e) { alert(`Error: ${(e as Error).message}`) }
    setDragTaskId(null); loadEventData(selectedEventId)
  }

  async function createTeam() {
    if (!teamName.trim() || !selectedEventId) return
    await api('create_team', { event_id: selectedEventId, name: teamName.trim(), color: teamColor })
    setTeamName(''); if (selectedEventId) loadEventData(selectedEventId)
  }

  async function deleteTeam(id: string) { await api('delete_team', { id }); if (selectedEventId) loadEventData(selectedEventId) }

  async function addMember(teamId: string, rsn: string) {
    await api('add_member', { team_id: teamId, rsn: rsn.trim() })
    if (selectedEventId) loadEventData(selectedEventId)
  }

  async function addMemberLegacy() {
    if (!memberRsn.trim() || !memberTeamId) return
    await addMember(memberTeamId, memberRsn)
    setMemberRsn('')
  }

  async function removeMember(id: string) { await api('remove_member', { id }); if (selectedEventId) loadEventData(selectedEventId) }
  async function doReview(subId: string, action: 'approved' | 'rejected') { await review(subId, action); setSubs(s => s.filter(x => x.id !== subId)) }

  async function deleteSignup(id: string) {
    await api('delete_signup', { id })
    setSignups(s => s.filter(x => x.id !== id))
  }

  async function dropOnTeam(teamId: string, rsnsDropped: string[]) {
    const assigned = new Set(members.map(m => m.rsn.toLowerCase()))
    const toAdd = rsnsDropped.filter(r => !assigned.has(r.toLowerCase()))
    for (const rsn of toAdd) await addMember(teamId, rsn)
    if (selectedEventId) {
      const teamsRes = await fetch(`/api/bingo/events/${selectedEventId}/teams`)
      const { teams: tm, members: m } = await teamsRes.json()
      setTeams(tm ?? []); setMembers(m ?? [])
    }
  }

  function loadTaskIntoForm(t: BingoTask) {
    setTaskForm({ id: t.id, position: t.position, title: t.title, description: t.description ?? '', image_url: t.image_url ?? '', points: t.points, required_count: t.required_count, points_per_submission: t.points_per_submission?.toString() ?? '' })
  }

  // Duo pair detection: mutual preferred_partner
  const confirmedPairs = new Map<string, string>() // rsn.lower → partner.lower
  for (const s of signups) {
    if (!s.preferred_partner) continue
    const pLower = s.preferred_partner.toLowerCase()
    const match = signups.find(x => x.rsn.toLowerCase() === pLower && x.preferred_partner?.toLowerCase() === s.rsn.toLowerCase())
    if (match) confirmedPairs.set(s.rsn.toLowerCase(), pLower)
  }

  // Build pool items: pairs as single units, solos individually
  type PoolItem = { type: 'solo'; signup: Signup } | { type: 'pair'; a: Signup; b: Signup }
  const assignedRsns = new Set(members.map(m => m.rsn.toLowerCase()))
  const seen = new Set<string>()
  const poolItems: PoolItem[] = []
  for (const s of signups) {
    const key = s.rsn.toLowerCase()
    if (seen.has(key) || assignedRsns.has(key)) continue
    const partnerKey = confirmedPairs.get(key)
    if (partnerKey && !seen.has(partnerKey) && !assignedRsns.has(partnerKey)) {
      const partnerSignup = signups.find(x => x.rsn.toLowerCase() === partnerKey)
      if (partnerSignup) {
        poolItems.push({ type: 'pair', a: s, b: partnerSignup })
        seen.add(key); seen.add(partnerKey)
        continue
      }
    }
    poolItems.push({ type: 'solo', signup: s })
    seen.add(key)
  }

  const teamSize = selectedEvent?.team_size ?? 2

  const tabs = [
    { key: 'events' as const, label: 'Events' },
    { key: 'tasks' as const, label: `Tasks (${tasks.length})` },
    { key: 'teams' as const, label: `Teams (${teams.length})` },
    { key: 'draft' as const, label: `Draft (${signups.length})` },
    { key: 'queue' as const, label: `Queue (${subs.length})` },
  ]

  const inp = 'w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]'

  function WomBadge({ rsn }: { rsn: string }) {
    const d = womData[rsn.toLowerCase()]
    if (!d) return null
    const badge = ACCOUNT_BADGES[d.type]
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-[#9898c0]">
        {badge && <span className="px-1 py-0.5 rounded text-[9px] font-bold" style={{ background: badge.color + '22', color: badge.color }}>{badge.label}</span>}
        <span>Lv {d.totalLevel}</span>
        <span className="text-[#c89b3c]">{d.ehp.toFixed(0)}EHP</span>
        <span className="text-[#57F287]">{d.ehb.toFixed(0)}EHB</span>
      </span>
    )
  }

  function PlayerCard({ rsn, compact = false }: { rsn: string; compact?: boolean }) {
    const d = womData[rsn.toLowerCase()]
    const badge = d ? ACCOUNT_BADGES[d.type] : null
    return (
      <div className={`flex flex-col gap-0.5 ${compact ? '' : 'py-0.5'}`}>
        <div className="flex items-center gap-1.5">
          {badge && <span className="px-1 py-0.5 rounded text-[9px] font-bold leading-none" style={{ background: badge.color + '22', color: badge.color }}>{badge.label}</span>}
          <span className="text-sm font-semibold text-[#e8e8f0] capitalize">{d?.displayName ?? rsn}</span>
        </div>
        {d && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[#7878a8]">Lv {d.totalLevel}</span>
            <span className="text-[#c89b3c]">{d.ehp.toFixed(0)} EHP</span>
            <span className="text-[#57F287]">{d.ehb.toFixed(0)} EHB</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {events.length > 0 && (
        <div className="mb-4">
          <select value={selectedEventId ?? ''} onChange={e => setSelectedEventId(e.target.value || null)}
            className="rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-1.5 text-sm outline-none">
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title} {ev.active ? '(active)' : ''}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-[#333358] overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? 'border-[#c89b3c] text-[#c89b3c]' : 'border-transparent text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Events tab ── */}
      {tab === 'events' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Create Event</h2>
            <div className="space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Event title (e.g. July Bingo)" className={inp} />
              <div>
                <label className="text-xs text-[#9898c0] mb-2 block">Board Size</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[{size:3,label:'3×3',sub:'9 tiles · Quick'},{size:4,label:'4×4',sub:'16 tiles · Standard'},{size:5,label:'5×5',sub:'25 tiles · Classic'},{size:6,label:'6×6',sub:'36 tiles · Marathon'}].map(({ size, label, sub }) => (
                    <button key={size} type="button" onClick={() => setNewSize(size)}
                      className={`p-3 rounded-lg border text-left transition-all ${newSize === size ? 'border-[#c89b3c] bg-[#c89b3c]/10' : 'border-[#333358] bg-[#1c1c36] hover:border-[#4a4a6a]'}`}>
                      <p className={`text-sm font-bold ${newSize === size ? 'text-[#c89b3c]' : 'text-[#e8e8f0]'}`}>{label}</p>
                      <p className="text-xs text-[#9898c0]">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9898c0] mb-2 block">Team Size</label>
                <div className="flex gap-2">
                  {[{n:1,l:'Solo'},{n:2,l:'Duo'},{n:3,l:'Trio'},{n:4,l:'Quad'},{n:5,l:'5-Man'},{n:6,l:'6-Man'}].map(({ n, l }) => (
                    <button key={n} type="button" onClick={() => setNewTeamSize(n)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${newTeamSize === n ? 'border-[#c89b3c] bg-[#c89b3c]/10 text-[#c89b3c]' : 'border-[#333358] bg-[#1c1c36] text-[#9898c0] hover:border-[#4a4a6a] hover:text-[#e8e8f0]'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createEvent} className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-semibold hover:bg-[#f0c060]">Create Event</button>
            </div>
          </div>

          <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">All Events</h2>
            {events.length === 0 ? <p className="text-sm text-[#9898c0]">No events yet.</p> : (
              <ul className="divide-y divide-[#333358]">
                {events.map(ev => (
                  <li key={ev.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#e8e8f0]">{ev.title}</p>
                        <p className="text-xs text-[#9898c0]">{ev.board_size}×{ev.board_size} · {ev.team_size ?? 2}-man teams</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEventEdit(ev)} className={`text-xs px-3 py-1 rounded border transition-colors ${editingEventId === ev.id ? 'bg-[#7c5ce8]/20 text-[#b09cf8] border-[#7c5ce8]/40' : 'bg-[#1c1c36] text-[#9898c0] border-[#333358] hover:text-[#e8e8f0]'}`}>
                          Settings
                        </button>
                        {ev.active ? (
                          <button onClick={() => setActive(null)} className="text-xs px-3 py-1 rounded bg-green-900/40 text-green-400 border border-green-800 hover:bg-green-900/60">Active ✓</button>
                        ) : (
                          <button onClick={() => setActive(ev.id)} className="text-xs px-3 py-1 rounded bg-[#1c1c36] text-[#9898c0] border border-[#333358] hover:text-[#e8e8f0]">Set Active</button>
                        )}
                      </div>
                    </div>
                    {editingEventId === ev.id && (
                      <div className="mt-3 space-y-3 border-t border-[#333358] pt-3">
                        <div>
                          <label className="text-xs text-[#9898c0] mb-1 block">Team Size</label>
                          <div className="flex gap-2">
                            {[{n:1,l:'Solo'},{n:2,l:'Duo'},{n:3,l:'Trio'},{n:4,l:'Quad'},{n:5,l:'5-Man'},{n:6,l:'6-Man'}].map(({ n, l }) => (
                              <button key={n} type="button" onClick={() => setEditTeamSize(n)}
                                className={`px-3 py-1 rounded border text-xs font-medium transition-all ${editTeamSize === n ? 'border-[#c89b3c] bg-[#c89b3c]/10 text-[#c89b3c]' : 'border-[#333358] bg-[#1c1c36] text-[#9898c0] hover:border-[#4a4a6a]'}`}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-[#9898c0] mb-1 block flex items-center gap-1">
                            Rules
                            <span className="font-normal text-[#7878a8]">— leave blank to use defaults · markdown supported</span>
                          </label>
                          <textarea value={rulesText} onChange={e => setRulesText(e.target.value)}
                            rows={6} placeholder="Enter custom rules for this event…"
                            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c] resize-none font-mono" />
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => saveEventSettings(ev.id)} className="px-4 py-1.5 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-xs font-semibold hover:bg-[#f0c060]">Save Settings</button>
                          {saveStatus && <span className="text-xs text-[#57F287]">{saveStatus}</span>}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Tasks tab ── */}
      {tab === 'tasks' && (
        <div className="space-y-5">
          {!selectedEventId || !selectedEvent ? <p className="text-sm text-[#9898c0]">Select an event above.</p> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">{taskForm.id ? 'Edit Task' : 'Add Task'}</h2>
                <div className="space-y-3">
                  <div><label className="text-xs text-[#9898c0] mb-1 block">Title</label><input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Get 5 sapphires from Giant Mole" className={inp} /></div>
                  <div><label className="text-xs text-[#9898c0] mb-1 block">Description <span className="font-normal">(optional)</span></label><input value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional context…" className={inp} /></div>
                  <div><label className="text-xs text-[#9898c0] mb-1 block">Image URL <span className="font-normal">(optional)</span></label><input value={taskForm.image_url} onChange={e => setTaskForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" className={inp} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-[#9898c0] mb-1 block">Points</label><input type="number" min={1} value={taskForm.points} onChange={e => setTaskForm(f => ({ ...f, points: Number(e.target.value) }))} className={inp} /></div>
                    <div><label className="text-xs text-[#9898c0] mb-1 block">Required submissions</label><input type="number" min={1} value={taskForm.required_count} onChange={e => setTaskForm(f => ({ ...f, required_count: Number(e.target.value) }))} className={inp} /></div>
                  </div>
                  <div><label className="text-xs text-[#9898c0] mb-1 block">Points per submission <span className="font-normal">(override)</span></label><input type="number" min={1} value={taskForm.points_per_submission} onChange={e => setTaskForm(f => ({ ...f, points_per_submission: e.target.value }))} placeholder="Leave blank to use task points" className={inp} /></div>
                  <div><label className="text-xs text-[#9898c0] mb-1 block">Position on board</label><input type="number" min={1} max={selectedEvent.board_size ** 2} value={taskForm.position} onChange={e => setTaskForm(f => ({ ...f, position: Number(e.target.value) }))} className={inp} /></div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={upsertTask} className="flex-1 px-4 py-2 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-semibold hover:bg-[#f0c060]">{taskForm.id ? 'Save Changes' : 'Add Task'}</button>
                    {taskForm.id && <button onClick={() => setTaskForm(EMPTY_TASK)} className="px-4 py-2 rounded-lg bg-[#1c1c36] text-[#9898c0] text-sm border border-[#333358] hover:text-[#e8e8f0]">Cancel</button>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Board Preview — {selectedEvent.board_size}×{selectedEvent.board_size}</h2>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${selectedEvent.board_size}, 1fr)` }}>
                  {Array.from({ length: selectedEvent.board_size ** 2 }, (_, i) => i + 1).map(pos => {
                    const task = tasks.find(t => t.position === pos)
                    const isDragging = dragTaskId !== null
                    return (
                      <div key={pos}
                        draggable={!!task}
                        onDragStart={() => task && setDragTaskId(task.id)}
                        onDragOver={e => { e.preventDefault() }}
                        onDrop={() => { if (dragTaskId) moveTaskTo(dragTaskId, pos) }}
                        onClick={() => task && loadTaskIntoForm(task)}
                        className={`aspect-square rounded-lg border text-[10px] flex flex-col items-center justify-center text-center p-1 cursor-pointer transition-all ${task ? (taskForm.id === task.id ? 'border-[#c89b3c] bg-[#c89b3c]/15 text-[#c89b3c]' : 'border-[#333358] bg-[#1c1c36] text-[#c0c0e0] hover:border-[#c89b3c]/50') : (isDragging ? 'border-dashed border-[#7c5ce8]/50 bg-[#7c5ce8]/5' : 'border-dashed border-[#333358] text-[#7878a8]')}`}
                      >
                        {task ? <span className="line-clamp-3 leading-tight">{task.title}</span> : <span>{pos}</span>}
                      </div>
                    )
                  })}
                </div>
                {tasks.length > 0 && (
                  <ul className="mt-4 space-y-1 max-h-48 overflow-y-auto">
                    {[...tasks].sort((a, b) => a.position - b.position).map(t => (
                      <li key={t.id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${taskForm.id === t.id ? 'bg-[#c89b3c]/15 text-[#c89b3c]' : 'text-[#9898c0] hover:text-[#e8e8f0] hover:bg-[#1c1c36]'}`}
                        onClick={() => loadTaskIntoForm(t)}>
                        <span className="shrink-0 w-5 text-center text-[#7878a8]">{t.position}</span>
                        <span className="flex-1 truncate">{t.title}</span>
                        <span className="shrink-0 text-[#c89b3c]">{t.points}pt</span>
                        <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }} className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50">Del</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Teams tab ── */}
      {tab === 'teams' && (
        <div className="space-y-6">
          {!selectedEventId ? <p className="text-sm text-[#9898c0]">Select an event above.</p> : (<>
            <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Create Team</h2>
              <div className="flex gap-2 flex-wrap">
                <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name"
                  className="flex-1 min-w-40 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]" />
                <div className="flex gap-1">{TEAM_COLORS.map(c => <button key={c} onClick={() => setTeamColor(c)} className={`w-7 h-7 rounded-full border-2 transition-all ${teamColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
                <button onClick={createTeam} className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-semibold hover:bg-[#f0c060]">Create</button>
              </div>
            </div>
            <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Add Member</h2>
              <div className="flex gap-2 flex-wrap">
                <select value={memberTeamId} onChange={e => setMemberTeamId(e.target.value)} className="rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input value={memberRsn} onChange={e => setMemberRsn(e.target.value)} placeholder="RSN"
                  className="flex-1 min-w-32 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]" />
                <button onClick={addMemberLegacy} className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-semibold hover:bg-[#f0c060]">Add</button>
              </div>
            </div>
            {teams.map(team => {
              const teamMembers = members.filter(m => m.team_id === team.id)
              return (
                <div key={team.id} className="rounded-xl border border-[#333358] bg-[#161628] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <span style={{ color: team.color }}>{team.name}</span>
                    </h3>
                    <button onClick={() => deleteTeam(team.id)} className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50">Delete team</button>
                  </div>
                  {teamMembers.length === 0 ? <p className="text-xs text-[#9898c0]">No members yet.</p> : (
                    <ul className="flex flex-wrap gap-2">
                      {teamMembers.map(m => (
                        <li key={m.id} className="flex items-center gap-1.5 bg-[#1c1c36] rounded px-2 py-1 text-xs text-[#e8e8f0]">
                          {m.rsn}<button onClick={() => removeMember(m.id)} className="text-[#9898c0] hover:text-red-400 ml-0.5">×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </>)}
        </div>
      )}

      {/* ── Draft tab ── */}
      {tab === 'draft' && (
        <div className="space-y-4">
          {!selectedEventId ? <p className="text-sm text-[#9898c0]">Select an event above.</p> : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs text-[#9898c0]">{signups.length} signed up · {poolItems.length} unassigned · {teamSize}-man teams</p>
                {womLoading && <span className="text-xs text-[#7878a8] animate-pulse">Loading WOM data…</span>}
                <button onClick={() => selectedEventId && loadDraftData(selectedEventId)} className="text-xs px-2 py-1 rounded border border-[#333358] text-[#9898c0] hover:text-[#e8e8f0] ml-auto">↻ Refresh</button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">

                {/* Teams (drop zones) */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Teams</p>
                  {teams.length === 0 && (
                    <p className="text-sm text-[#9898c0]">No teams yet — create them in the Teams tab first.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teams.map(team => {
                      const teamMembers = members.filter(m => m.team_id === team.id)
                      const slots = Array.from({ length: teamSize }, (_, i) => teamMembers[i] ?? null)
                      const isTarget = draftDropTarget === team.id
                      return (
                        <div key={team.id}
                          onDragOver={e => { e.preventDefault(); setDraftDropTarget(team.id) }}
                          onDragLeave={() => setDraftDropTarget(null)}
                          onDrop={e => {
                            e.preventDefault()
                            setDraftDropTarget(null)
                            const rsns = JSON.parse(e.dataTransfer.getData('rsns') || '[]') as string[]
                            if (rsns.length) dropOnTeam(team.id, rsns)
                          }}
                          className={`rounded-xl border p-3 transition-all ${isTarget ? 'border-dashed scale-[1.02]' : 'border-[#333358]'} bg-[#0d0d1a]`}
                          style={{ borderColor: isTarget ? team.color : undefined }}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                            <span className="text-xs font-bold" style={{ color: team.color }}>{team.name}</span>
                            <span className="text-[10px] text-[#7878a8] ml-auto">{teamMembers.length}/{teamSize}</span>
                          </div>
                          <div className="space-y-1.5">
                            {slots.map((m, i) => m ? (
                              <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[#1c1c36]">
                                <PlayerCard rsn={m.rsn} compact />
                                <button onClick={() => removeMember(m.id)} className="text-[#7878a8] hover:text-[#ED4245] text-xs shrink-0 ml-1">×</button>
                              </div>
                            ) : (
                              <div key={i} className="px-2 py-3 rounded-lg border border-dashed border-[#333358] flex items-center justify-center">
                                <span className="text-[10px] text-[#4a4a6a]">empty slot</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Player pool */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8] mb-3">Signups Pool</p>
                  {poolItems.length === 0 && signups.length === 0 && (
                    <p className="text-sm text-[#9898c0]">No sign-ups yet.</p>
                  )}
                  {poolItems.length === 0 && signups.length > 0 && (
                    <p className="text-sm text-[#57F287]">All players assigned! ✓</p>
                  )}
                  <div className="space-y-2">
                    {poolItems.map((item, idx) => {
                      if (item.type === 'pair') {
                        const rsns = [item.a.rsn, item.b.rsn]
                        return (
                          <div key={idx} draggable
                            onDragStart={e => { setDragRsns(rsns); e.dataTransfer.setData('rsns', JSON.stringify(rsns)) }}
                            onDragEnd={() => setDragRsns([])}
                            className={`rounded-xl border border-[#7c5ce8]/40 bg-[#12122a] p-3 cursor-grab active:cursor-grabbing transition-opacity ${dragRsns.includes(item.a.rsn) ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#7c5ce8]/20 text-[#b09cf8]">DUO PAIR</span>
                              <span className="text-[10px] text-[#7878a8]">drag to assign both</span>
                            </div>
                            <div className="space-y-2">
                              {[item.a, item.b].map(s => (
                                <div key={s.id} className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <PlayerCard rsn={s.rsn} />
                                    {s.discord_username && <p className="text-[10px] text-[#7878a8] mt-0.5">{s.discord_username}</p>}
                                    {s.expected_playtime && <p className="text-[10px] text-[#9898c0]">{s.expected_playtime}</p>}
                                  </div>
                                  <button onClick={() => deleteSignup(s.id)} className="text-[10px] text-[#7878a8] hover:text-[#ED4245] shrink-0">✕</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      const s = item.signup
                      return (
                        <div key={s.id} draggable
                          onDragStart={e => { setDragRsns([s.rsn]); e.dataTransfer.setData('rsns', JSON.stringify([s.rsn])) }}
                          onDragEnd={() => setDragRsns([])}
                          className={`rounded-xl border border-[#333358] bg-[#0d0d1a] p-3 cursor-grab active:cursor-grabbing transition-opacity ${dragRsns.includes(s.rsn) ? 'opacity-50' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <PlayerCard rsn={s.rsn} />
                              {s.discord_username && <p className="text-[10px] text-[#7878a8] mt-0.5">{s.discord_username}</p>}
                              {s.expected_playtime && <p className="text-[10px] text-[#9898c0]">{s.expected_playtime}</p>}
                              {s.preferred_partner && (
                                <p className="text-[10px] text-[#7878a8] mt-0.5">
                                  Wants to pair with <span className="text-[#9898c0]">{s.preferred_partner}</span>
                                  {!confirmedPairs.has(s.rsn.toLowerCase()) && <span className="text-[#ED4245]/70"> (unconfirmed)</span>}
                                </p>
                              )}
                              {s.notes && <p className="text-[10px] text-[#7878a8] mt-0.5 italic">{s.notes}</p>}
                            </div>
                            <button onClick={() => deleteSignup(s.id)} className="text-[10px] text-[#7878a8] hover:text-[#ED4245] shrink-0 mt-0.5">✕</button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Show assigned players collapsed */}
                    {signups.filter(s => assignedRsns.has(s.rsn.toLowerCase())).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-[#7878a8] cursor-pointer hover:text-[#9898c0] select-none">
                          {signups.filter(s => assignedRsns.has(s.rsn.toLowerCase())).length} assigned players
                        </summary>
                        <div className="mt-2 space-y-1">
                          {signups.filter(s => assignedRsns.has(s.rsn.toLowerCase())).map(s => (
                            <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#1c1c36]/50 opacity-60">
                              <span className="text-xs text-[#9898c0] capitalize">{s.rsn}</span>
                              <span className="text-[10px] text-[#57F287]">✓ assigned</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Queue tab ── */}
      {tab === 'queue' && (
        <div className="space-y-4">
          {!selectedEventId ? <p className="text-sm text-[#9898c0]">Select an event above.</p>
          : subs.length === 0 ? <div className="rounded-xl border border-[#333358] bg-[#161628] p-8 text-center text-sm text-[#9898c0]">No pending submissions.</div>
          : subs.map(sub => {
            const task = tasks.find(t => t.id === sub.task_id)
            return (
              <div key={sub.id} className="rounded-xl border border-[#333358] bg-[#161628] p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-[#e8e8f0]">{sub.rsn}</p>
                    <p className="text-xs text-[#c89b3c] mt-0.5">{task?.title ?? sub.task_id}</p>
                    {sub.notes && <p className="text-xs text-[#9898c0] mt-1 italic">"{sub.notes}"</p>}
                    <p className="text-xs text-[#9898c0] mt-1">{new Date(sub.submitted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => doReview(sub.id, 'approved')} className="px-3 py-1.5 rounded-lg bg-green-900/40 text-green-400 border border-green-800 text-sm font-medium hover:bg-green-900/60">✓ Approve</button>
                    <button onClick={() => doReview(sub.id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-red-900/40 text-red-400 border border-red-900/50 text-sm font-medium hover:bg-red-900/60">✕ Reject</button>
                  </div>
                </div>
                {sub.screenshot_url && <img src={sub.screenshot_url} alt="submission" className="mt-3 max-h-48 rounded-lg border border-[#333358] object-contain" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
