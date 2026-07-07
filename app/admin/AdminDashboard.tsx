'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type BingoEvent = { id: string; title: string; board_size: number; active: boolean; created_at: string }
type BingoTask = { id: string; position: number; title: string; description: string | null; image_url: string | null; points: number; required_count: number; points_per_submission: number | null }
type BingoTeam = { id: string; name: string; color: string }
type BingoMember = { id: string; team_id: string; rsn: string }
type BingoSub = { id: string; task_id: string; rsn: string; screenshot_url: string | null; notes: string | null; status: string; submitted_at: string }
type DiscordActivity = { discord_id: string; display_name: string | null; role_name: string | null; rsn: string | null; promotion_note: string | null; message_count: number; month_count: number; last_message_at: string | null }
type IngameActivity = { rsn: string; message_count: number; month_count: number; last_message_at: string | null }
type VcActivity = { discord_id: string; display_name: string | null; role_name: string | null; total_minutes: number; month_minutes: number; last_seen_at: string | null }
type ClanEvent = { id: string; title: string; description: string | null; event_type: string; scheduled_at: string | null; channel_id: string | null; created_at: string; event_rsvps: { count: number }[] }
type Rsvp = { discord_id: string; display_name: string | null; rsvped_at: string }
type GuildConfig = { planks_channel_id?: string | null; drops_channel_id?: string | null; lootsubmit_channel_id?: string | null; welcome_channel_id?: string | null; welcome_mod_channel_id?: string | null; welcome_role_id?: string | null; clanchat_channel_id?: string | null; broadcast_channel_id?: string | null; inactivity_channel_id?: string | null; recap_channel_id?: string | null }
type Channel = { id: string; name: string }
type Role = { id: string; name: string }
type Raid = { id: string; name: string; timestamp: number; description: string | null; channel_id: string | null; signups: {id:string;username:string}[]; attendees: {id:string;username:string}[] | null; created_at: string }
type PanelRole = { roleId: string; emoji: string; label: string }
type RolePanel = { channelId: string | null; messageId: string | null; roles: PanelRole[] }

function formatMinutes(mins: number): string {
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const TEAM_COLORS = ['#c89b3c', '#5865F2', '#57F287', '#ED4245', '#FEE75C', '#EB459E', '#3498db']

const EMPTY_TASK = { id: '', position: 0, title: '', description: '', image_url: '', points: 1, required_count: 1, points_per_submission: '' }

async function api(action: string, extra: object = {}) {
  const res = await fetch('/api/bingo/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}: ${text}`)
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
  const [section, setSection] = useState<'bingo' | 'tools'>('tools')
  const [tab, setTab] = useState<'events' | 'tasks' | 'teams' | 'queue'>('events')
  const [toolsTab, setToolsTab] = useState<'activity' | 'messenger' | 'events' | 'settings'>('activity')
  const [events, setEvents] = useState<BingoEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<BingoTask[]>([])
  const [teams, setTeams] = useState<BingoTeam[]>([])
  const [members, setMembers] = useState<BingoMember[]>([])
  const [subs, setSubs] = useState<BingoSub[]>([])
  const [discordActivity, setDiscordActivity] = useState<DiscordActivity[]>([])
  const [ingameActivity, setIngameActivity] = useState<IngameActivity[]>([])
  const [vcActivity, setVcActivity] = useState<VcActivity[]>([])
  const [activityLoaded, setActivityLoaded] = useState(false)
  const [discordOpen, setDiscordOpen] = useState(true)
  const [ingameOpen, setIngameOpen] = useState(true)
  const [vcOpen, setVcOpen] = useState(true)
  const [discordPage, setDiscordPage] = useState(0)
  const [ingamePage, setIngamePage] = useState(0)
  const [vcPage, setVcPage] = useState(0)
  const [combined, setCombined] = useState(false)
  const [combinedPage, setCombinedPage] = useState(0)
  const [clanEvents, setClanEvents] = useState<ClanEvent[]>([])
  const [guildConfig, setGuildConfig] = useState<GuildConfig>({})
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventType, setEventType] = useState('Event')
  const [eventDate, setEventDate] = useState('')
  const [eventChannel, setEventChannel] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const [rsvpEventId, setRsvpEventId] = useState<string | null>(null)
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [raids, setRaids] = useState<Raid[]>([])
  const [raidName, setRaidName] = useState('')
  const [raidTimestamp, setRaidTimestamp] = useState('')
  const [raidDesc, setRaidDesc] = useState('')
  const [raidChannel, setRaidChannel] = useState('')
  const [rolePanel, setRolePanel] = useState<RolePanel>({ channelId: null, messageId: null, roles: [] })
  const [panelRole, setPanelRole] = useState('')
  const [panelEmoji, setPanelEmoji] = useState('')
  const [panelLabel, setPanelLabel] = useState('')
  const [panelChannel, setPanelChannel] = useState('')
  const [scrapeRunning, setScrapeRunning] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null)
  const [welcomePosting, setWelcomePosting] = useState(false)
  const [welcomeStatus, setWelcomeStatus] = useState<string | null>(null)
  const [embedChannel, setEmbedChannel] = useState('')
  const [embedTitle, setEmbedTitle] = useState('')
  const [embedDesc, setEmbedDesc] = useState('')
  const [embedColor, setEmbedColor] = useState('#7c5ce8')
  const [embedSending, setEmbedSending] = useState(false)
  const [embedStatus, setEmbedStatus] = useState<string | null>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  function wrapText(before: string, after = before) {
    const el = descRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = embedDesc.substring(start, end)
    const next = embedDesc.substring(0, start) + before + selected + after + embedDesc.substring(end)
    setEmbedDesc(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  function prefixLine(prefix: string) {
    const el = descRef.current
    if (!el) return
    const start = el.selectionStart
    const lineStart = embedDesc.lastIndexOf('\n', start - 1) + 1
    const next = embedDesc.substring(0, lineStart) + prefix + embedDesc.substring(lineStart)
    setEmbedDesc(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + prefix.length, start + prefix.length)
    }, 0)
  }

  // Forms
  const [newTitle, setNewTitle] = useState('')
  const [newSize, setNewSize] = useState(5)
  const [taskForm, setTaskForm] = useState(EMPTY_TASK)
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0])
  const [memberRsn, setMemberRsn] = useState('')
  const [memberTeamId, setMemberTeamId] = useState('')

  // Drag state for board builder
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)

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
  useEffect(() => { loadTools() }, [])

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
    const pps = taskForm.points_per_submission ? Number(taskForm.points_per_submission) : null
    try {
      await api('upsert_task', { ...taskForm, event_id: selectedEventId, points_per_submission: pps })
      setTaskForm({ ...EMPTY_TASK, position: tasks.length + 1 })
      loadEventData(selectedEventId)
    } catch (e) {
      alert(`Error: ${(e as Error).message}`)
    }
  }

  async function deleteTask(id: string) {
    await api('delete_task', { id })
    if (selectedEventId) loadEventData(selectedEventId)
  }

  // Drag-to-move: immediately commits position change without going through the form
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
        await api('upsert_task', {
          id: src.id, event_id: selectedEventId, position: newPos,
          title: src.title, description: src.description, image_url: src.image_url,
          points: src.points, required_count: src.required_count,
          points_per_submission: src.points_per_submission,
        })
        if (taskForm.id === taskId) setTaskForm(f => ({ ...f, position: newPos }))
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`)
    }
    setDragTaskId(null)
    loadEventData(selectedEventId)
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

  function loadTaskIntoForm(t: BingoTask) {
    setTaskForm({
      id: t.id, position: t.position, title: t.title,
      description: t.description ?? '', image_url: t.image_url ?? '',
      points: t.points, required_count: t.required_count,
      points_per_submission: t.points_per_submission?.toString() ?? '',
    })
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'events', label: 'Events' },
    { key: 'tasks', label: `Tasks (${tasks.length})` },
    { key: 'teams', label: `Teams (${teams.length})` },
    { key: 'queue', label: `Queue (${subs.length})` },
  ]

  async function loadTools() {
    if (activityLoaded) return
    const [actRes, chRes, roleRes, evRes, cfgRes, raidsRes, panelRes] = await Promise.all([
      fetch('/api/admin/activity'),
      fetch('/api/admin/channels'),
      fetch('/api/admin/roles'),
      fetch('/api/admin/events'),
      fetch('/api/admin/config'),
      fetch('/api/admin/raids'),
      fetch('/api/admin/rolepanel'),
    ])
    const actData = await actRes.json()
    const chData = await chRes.json()
    const roleData = await roleRes.json()
    const evData = await evRes.json()
    const cfgData = await cfgRes.json()
    const raidsData = await raidsRes.json()
    const panelData = await panelRes.json()
    setDiscordActivity(actData.discord ?? [])
    setIngameActivity(actData.ingame ?? [])
    setVcActivity(actData.vc ?? [])
    setChannels(chData.channels ?? [])
    setRoles(roleData.roles ?? [])
    if (chData.channels?.length) { setEmbedChannel(chData.channels[0].id); setEventChannel(chData.channels[0].id); setRaidChannel(chData.channels[0].id) }
    setClanEvents(evData.events ?? [])
    setGuildConfig(cfgData.config ?? {})
    setRaids(raidsData.raids ?? [])
    setRolePanel(panelData.panel ?? { channelId: null, messageId: null, roles: [] })
    setActivityLoaded(true)
  }

  async function createClanEvent() {
    if (!eventTitle.trim() || !eventChannel) return
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: eventTitle, description: eventDesc, event_type: eventType, scheduled_at: eventDate || null, channel_id: eventChannel }),
    })
    if (res.ok) {
      const { event } = await res.json()
      setClanEvents(ev => [...ev, { ...event, event_rsvps: [{ count: 0 }] }])
      setEventTitle('')
      setEventDesc('')
      setEventDate('')
    }
  }

  async function deleteEvent(id: string) {
    await fetch('/api/admin/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setClanEvents(ev => ev.filter(e => e.id !== id))
    if (rsvpEventId === id) setRsvpEventId(null)
  }

  async function loadRsvps(eventId: string) {
    setRsvpEventId(eventId === rsvpEventId ? null : eventId)
    if (eventId === rsvpEventId) return
    const res = await fetch(`/api/admin/events?rsvps=${eventId}`)
    const { rsvps: data } = await res.json()
    setRsvps(data ?? [])
  }

  async function saveNote(discordId: string, note: string) {
    setEditingNoteId(null)
    await fetch('/api/admin/activity', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id: discordId, note }) })
    setDiscordActivity(da => da.map(d => d.discord_id === discordId ? { ...d, promotion_note: note || null } : d))
  }

  async function saveConfig(patch: Partial<GuildConfig>) {
    const updated = { ...guildConfig, ...patch }
    setGuildConfig(updated)
    await fetch('/api/admin/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
  }

  async function scheduleRaid() {
    if (!raidName.trim() || !raidTimestamp || !raidChannel) return
    const timestamp = Math.floor(new Date(raidTimestamp).getTime() / 1000)
    const res = await fetch('/api/admin/raids', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: raidName.trim(), timestamp, description: raidDesc || null, channel_id: raidChannel }),
    })
    if (res.ok) {
      const data = await res.json()
      setRaids(r => [...r, data.raid].sort((a, b) => a.timestamp - b.timestamp))
      setRaidName(''); setRaidTimestamp(''); setRaidDesc('')
    }
  }

  async function addPanelRole() {
    if (!panelRole || !panelEmoji.trim()) return
    const label = panelLabel.trim() || roles.find(r => r.id === panelRole)?.name || panelRole
    const res = await fetch('/api/admin/rolepanel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: panelRole, emoji: panelEmoji.trim(), label }),
    })
    if (res.ok) {
      const data = await res.json()
      setRolePanel(data.panel)
      setPanelRole(''); setPanelEmoji(''); setPanelLabel('')
    }
  }

  async function removePanelRole(roleId: string) {
    const res = await fetch('/api/admin/rolepanel', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    })
    if (res.ok) { const data = await res.json(); setRolePanel(data.panel) }
  }

  async function postRolePanel() {
    if (!panelChannel) return
    const res = await fetch('/api/admin/rolepanel', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: panelChannel }),
    })
    if (res.ok) { const data = await res.json(); setRolePanel(data.panel) }
  }

  async function postWelcomeMessage() {
    setWelcomePosting(true); setWelcomeStatus(null)
    const res = await fetch('/api/admin/welcome', { method: 'POST' })
    const data = await res.json()
    setWelcomePosting(false)
    setWelcomeStatus(res.ok ? '✅ Welcome panel posted!' : `❌ ${data.error}`)
  }

  async function scrapeHistory(period: 'month' | 'all') {
    setScrapeRunning(true); setScrapeStatus(null)
    const res = await fetch('/api/admin/scrape', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    })
    const data = await res.json()
    setScrapeRunning(false)
    setScrapeStatus(res.ok
      ? `✅ Done — ${data.inserted} drops imported, ${data.skipped} already existed (${data.total} messages scanned).`
      : `❌ ${data.error}`)
  }

  async function sendEmbed() {
    if (!embedChannel) return
    setEmbedSending(true)
    setEmbedStatus(null)
    try {
      const res = await fetch('/api/admin/send-embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: embedChannel, title: embedTitle, description: embedDesc, color: embedColor }),
      })
      const data = await res.json()
      setEmbedStatus(res.ok ? '✅ Sent!' : `❌ ${data.error}`)
      if (res.ok) { setEmbedTitle(''); setEmbedDesc('') }
    } catch {
      setEmbedStatus('❌ Network error')
    }
    setEmbedSending(false)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#c89b3c] uppercase tracking-widest">Staff Panel</h1>
      </div>

      {/* Section switcher */}
      <div className="flex gap-2 mb-6">
        {(['bingo', 'tools'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setSection(s); if (s === 'tools') loadTools() }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-all ${
              section === s
                ? 'bg-[#c89b3c]/12 text-[#c89b3c] border-[#c89b3c]/40'
                : 'bg-[#0e0e1c] text-[#7070a0] border-[#2a2a4a] hover:text-[#e8e8f0]'
            }`}
          >
            {s === 'bingo' ? 'Bingo' : 'Tools'}
          </button>
        ))}
      </div>

      {/* Bingo section */}
      {section === 'bingo' && (<>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
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
            <div className="space-y-3">
              <input
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Event title (e.g. July Bingo)"
                className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]"
              />
              <div>
                <label className="text-xs text-[#7070a0] mb-2 block">Board Size</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { size: 3, label: '3×3', sub: '9 tiles · Quick' },
                    { size: 4, label: '4×4', sub: '16 tiles · Standard' },
                    { size: 5, label: '5×5', sub: '25 tiles · Classic' },
                    { size: 6, label: '6×6', sub: '36 tiles · Marathon' },
                  ].map(({ size, label, sub }) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setNewSize(size)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        newSize === size
                          ? 'border-[#c89b3c] bg-[#c89b3c]/10'
                          : 'border-[#2a2a4a] bg-[#141427] hover:border-[#4a4a6a]'
                      }`}
                    >
                      <p className={`text-sm font-bold ${newSize === size ? 'text-[#c89b3c]' : 'text-[#e8e8f0]'}`}>{label}</p>
                      <p className="text-xs text-[#7070a0]">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createEvent}
                className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060] transition-colors">
                Create Event
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
        <div className="space-y-5">
          {!selectedEventId || !selectedEvent ? (
            <p className="text-sm text-[#7070a0]">Select an event above.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Task form */}
                <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">
                    {taskForm.id ? 'Edit Task' : 'Add Task'}
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-[#7070a0] mb-1 block">Title</label>
                      <input
                        value={taskForm.title}
                        onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Get 5 sapphires from Giant Mole"
                        className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#7070a0] mb-1 block">Description <span className="font-normal">(optional)</span></label>
                      <input
                        value={taskForm.description}
                        onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Additional context…"
                        className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#7070a0] mb-1 block">Image URL <span className="font-normal">(optional)</span></label>
                      <input
                        value={taskForm.image_url}
                        onChange={e => setTaskForm(f => ({ ...f, image_url: e.target.value }))}
                        placeholder="https://…"
                        className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#7070a0] mb-1 block">Points</label>
                        <input
                          type="number" min={1} value={taskForm.points}
                          onChange={e => setTaskForm(f => ({ ...f, points: Number(e.target.value) }))}
                          className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#7070a0] mb-1 block">Required submissions</label>
                        <input
                          type="number" min={1} value={taskForm.required_count}
                          onChange={e => setTaskForm(f => ({ ...f, required_count: Number(e.target.value) }))}
                          className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#7070a0] mb-1 block">
                        Points per submission <span className="font-normal">(optional — partial credit before tile completion)</span>
                      </label>
                      <input
                        type="number" min={1} value={taskForm.points_per_submission}
                        onChange={e => setTaskForm(f => ({ ...f, points_per_submission: e.target.value }))}
                        placeholder={`e.g. ${Math.round(taskForm.points / Math.max(taskForm.required_count, 1))}`}
                        className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c]"
                      />
                    </div>

                    {/* Position indicator — driven by board click */}
                    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-[#141427] border border-[#252540]">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-dashed border-[#c89b3c] bg-[#c89b3c]/10 text-[#c89b3c] text-xs font-bold shrink-0">
                        {taskForm.position}
                      </div>
                      <span className="text-xs text-[#6868a0]">Tile position — click any cell on the board →</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={upsertTask}
                        className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-semibold hover:bg-[#f0c060] transition-colors"
                      >
                        {taskForm.id ? 'Save Changes' : 'Add Task'}
                      </button>
                      {taskForm.id && (
                        <button
                          onClick={() => setTaskForm({ ...EMPTY_TASK, position: tasks.length })}
                          className="px-4 py-2 rounded-lg bg-[#141427] text-[#7070a0] text-sm border border-[#2a2a4a] hover:text-[#e8e8f0]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual board */}
                <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
                      Board · {selectedEvent.board_size}×{selectedEvent.board_size}
                    </h2>
                    <p className="text-[10px] text-[#4a4a70]">Click to place · Drag to move</p>
                  </div>

                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${selectedEvent.board_size}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: selectedEvent.board_size ** 2 }).map((_, pos) => {
                      const task = tasks.find(t => t.position === pos)
                      const isSelectedPos = taskForm.position === pos
                      const isEditingThis = task?.id === taskForm.id
                      const isDraggingThis = task?.id === dragTaskId

                      if (task) {
                        return (
                          <div
                            key={pos}
                            draggable
                            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragTaskId(task.id) }}
                            onDragEnd={() => setDragTaskId(null)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); if (dragTaskId && dragTaskId !== task.id) moveTaskTo(dragTaskId, pos) }}
                            onClick={() => loadTaskIntoForm(task)}
                            className={`aspect-square rounded-lg border p-1.5 flex flex-col overflow-hidden transition-all select-none
                              ${isEditingThis
                                ? 'border-[#c89b3c] bg-[#c89b3c]/15 cursor-grab'
                                : isDraggingThis
                                  ? 'border-[#3a3a60] bg-[#141427] opacity-40 scale-95 cursor-grabbing'
                                  : 'border-[#2a2a4a] bg-[#141427] hover:border-[#5a5a8a] hover:bg-[#1a1a30] cursor-grab'
                              }`}
                          >
                            <p className="text-[9px] font-semibold text-[#e8e8f0] leading-tight line-clamp-3 flex-1">{task.title}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[8px] font-bold text-[#c89b3c]">{task.points}pt</span>
                              <span className="text-[7px] text-[#4a4a70]">#{pos}</span>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={pos}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => { e.preventDefault(); if (dragTaskId) moveTaskTo(dragTaskId, pos) }}
                          onClick={() => setTaskForm(f => ({ ...f, position: pos }))}
                          className={`aspect-square rounded-lg border flex items-center justify-center cursor-pointer transition-all
                            ${isSelectedPos
                              ? 'border-[#c89b3c] border-dashed bg-[#c89b3c]/10'
                              : dragTaskId
                                ? 'border-[#3a3a60] border-dashed bg-[#141427]/60 hover:border-[#c89b3c]/60 hover:bg-[#c89b3c]/5'
                                : 'border-[#1a1a30] bg-[#0a0a18] hover:border-[#3a3a60] hover:bg-[#141427]'
                            }`}
                        >
                          <span className={`text-[9px] font-mono ${isSelectedPos ? 'text-[#c89b3c]' : 'text-[#252540]'}`}>
                            {pos}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Task list */}
              {tasks.length > 0 && (
                <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">
                    All Tasks ({tasks.length})
                  </h2>
                  <ul className="divide-y divide-[#1a1a30]">
                    {[...tasks].sort((a, b) => a.position - b.position).map(t => (
                      <li key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-mono text-[#4a4a70] w-6 text-center shrink-0">#{t.position}</span>
                          <span className={`text-sm truncate ${t.id === taskForm.id ? 'text-[#c89b3c]' : 'text-[#e8e8f0]'}`}>{t.title}</span>
                          <span className="text-xs text-[#6868a0] shrink-0">{t.points}pt · ×{t.required_count}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => loadTaskIntoForm(t)}
                            className="text-xs px-2 py-1 rounded bg-[#141427] text-[#7070a0] border border-[#2a2a4a] hover:text-[#e8e8f0]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50"
                          >
                            Del
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
      </>)}

      {section === 'tools' && (
        <div className="space-y-6">
          {/* Tools sub-nav */}
          <div className="flex gap-1 border-b border-[#2a2a4a]">
            {([['activity', 'Activity Logs'], ['events', 'Events'], ['messenger', 'Bot Messenger'], ['settings', 'Settings']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setToolsTab(key)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  toolsTab === key ? 'border-[#c89b3c] text-[#c89b3c]' : 'border-transparent text-[#7070a0] hover:text-[#e8e8f0]'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {toolsTab === 'activity' && (() => {
            const PAGE = 25
            type CombinedRow = { key: string; name: string; type: 'Discord' | 'In-Game'; role: string | null; month_count: number; message_count: number; last_at: string | null }
            const combinedData: CombinedRow[] = combined ? [
              ...discordActivity.map(d => ({ key: `d-${d.discord_id}`, name: d.display_name ?? d.discord_id, type: 'Discord' as const, role: d.role_name, month_count: d.month_count, message_count: d.message_count, last_at: d.last_message_at })),
              ...ingameActivity.map(ig => ({ key: `i-${ig.rsn}`, name: ig.rsn, type: 'In-Game' as const, role: null, month_count: ig.month_count, message_count: ig.message_count, last_at: ig.last_message_at })),
            ].sort((a, b) => b.month_count - a.month_count) : []
            const combinedPages = Math.ceil(combinedData.length / PAGE)
            const combinedSlice = combinedData.slice(combinedPage * PAGE, (combinedPage + 1) * PAGE)
            const discordPages = Math.ceil(discordActivity.length / PAGE)
            const discordSlice = discordActivity.slice(discordPage * PAGE, (discordPage + 1) * PAGE)
            const ingamePages = Math.ceil(ingameActivity.length / PAGE)
            const ingameSlice = ingameActivity.slice(ingamePage * PAGE, (ingamePage + 1) * PAGE)
            const vcPages = Math.ceil(vcActivity.length / PAGE)
            const vcSlice = vcActivity.slice(vcPage * PAGE, (vcPage + 1) * PAGE)
            return (<>
              {/* Combine toggle */}
              <div className="flex justify-end">
                <button onClick={() => { setCombined(c => !c); setCombinedPage(0) }}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${combined ? 'border-[#7c5ce8] bg-[#7c5ce8]/15 text-[#b09cf8]' : 'border-[#2a2a4a] text-[#7070a0] hover:text-[#e8e8f0]'}`}>
                  {combined ? 'Split View' : 'Combined View'}
                </button>
              </div>

              {combined ? (
                <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
                  <div className="flex items-center px-5 py-3 border-b border-[#2a2a4a]">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Chat Activity — Combined {combinedData.length > 0 && <span className="text-[#4a4a70] normal-case">({combinedData.length})</span>}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a1a30]">
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Name</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Type</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">This Month</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">All Time</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Last Seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedSlice.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#4a4a70]">{activityLoaded ? 'No data yet.' : 'Loading…'}</td></tr>
                        ) : combinedSlice.map((row, i) => (
                          <tr key={row.key} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50">
                            <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{combinedPage * PAGE + i + 1}</td>
                            <td className="px-4 py-2.5">
                              <span className="text-sm font-medium text-[#e8e8f0]">{row.name}</span>
                              {row.role && <span className="text-xs text-[#7c5ce8] ml-2">{row.role}</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.type === 'Discord' ? 'bg-[#5865F2]/20 text-[#8ea0f8]' : 'bg-[#3d9970]/20 text-[#5cbf87]'}`}>{row.type}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm font-bold text-[#c89b3c]">{row.month_count.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.message_count.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.last_at ? new Date(row.last_at).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {combinedPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-[#1a1a30]">
                      <button onClick={() => setCombinedPage(p => Math.max(0, p - 1))} disabled={combinedPage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                      <span className="text-xs text-[#4a4a70]">Page {combinedPage + 1} of {combinedPages}</span>
                      <button onClick={() => setCombinedPage(p => Math.min(combinedPages - 1, p + 1))} disabled={combinedPage === combinedPages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
                    </div>
                  )}
                </div>
              ) : (<>
                {/* Discord Activity */}
                <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
                  <button onClick={() => setDiscordOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#2a2a4a] hover:bg-[#141427]/50 transition-colors">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Discord Activity {discordActivity.length > 0 && <span className="text-[#4a4a70] normal-case">({discordActivity.length})</span>}</h2>
                    <span className="text-[#4a4a70] text-sm">{discordOpen ? '▲' : '▼'}</span>
                  </button>
                  {discordOpen && (<>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#1a1a30]">
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Member</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Role</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Note</th>
                            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">This Month</th>
                            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">All Time</th>
                            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Last Seen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {discordSlice.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[#4a4a70]">{activityLoaded ? 'No data yet.' : 'Loading…'}</td></tr>
                          ) : discordSlice.map((row, i) => (
                            <tr key={row.discord_id} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50">
                              <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{discordPage * PAGE + i + 1}</td>
                              <td className="px-4 py-2.5">
                                <span className="text-sm font-medium text-[#e8e8f0]">{row.display_name ?? row.discord_id}</span>
                                {row.rsn && <span className="text-xs text-[#3d9970] ml-2">⚔️ {row.rsn}</span>}
                                <span className="text-xs text-[#4a4a70] block">{row.discord_id}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-[#7c5ce8]">{row.role_name ?? '—'}</td>
                              <td className="px-4 py-2.5 max-w-[160px]">
                                {editingNoteId === row.discord_id ? (
                                  <input autoFocus defaultValue={noteValue} onBlur={e => saveNote(row.discord_id, e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote(row.discord_id, (e.target as HTMLInputElement).value)} className="w-full bg-[#1a1a30] border border-[#7c5ce8]/50 rounded px-2 py-1 text-xs text-[#e8e8f0] outline-none" />
                                ) : (
                                  <button onClick={() => { setEditingNoteId(row.discord_id); setNoteValue(row.promotion_note ?? '') }} className="text-xs text-left w-full truncate text-[#6868a0] hover:text-[#e8e8f0] transition-colors">
                                    {row.promotion_note ?? <span className="text-[#3a3a60]">add note…</span>}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm font-bold text-[#c89b3c]">{row.month_count.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.message_count.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.last_message_at ? new Date(row.last_message_at).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {discordPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-2 border-t border-[#1a1a30]">
                        <button onClick={() => setDiscordPage(p => Math.max(0, p - 1))} disabled={discordPage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                        <span className="text-xs text-[#4a4a70]">Page {discordPage + 1} of {discordPages}</span>
                        <button onClick={() => setDiscordPage(p => Math.min(discordPages - 1, p + 1))} disabled={discordPage === discordPages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
                      </div>
                    )}
                  </>)}
                </div>

                {/* In-Game Activity */}
                <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
                  <button onClick={() => setIngameOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#2a2a4a] hover:bg-[#141427]/50 transition-colors">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">In-Game Activity {ingameActivity.length > 0 && <span className="text-[#4a4a70] normal-case">({ingameActivity.length})</span>}</h2>
                    <span className="text-[#4a4a70] text-sm">{ingameOpen ? '▲' : '▼'}</span>
                  </button>
                  {ingameOpen && (<>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#1a1a30]">
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                            <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">RSN</th>
                            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">This Month</th>
                            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">All Time</th>
                            <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Last Seen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingameSlice.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#4a4a70]">{activityLoaded ? 'No data yet.' : 'Loading…'}</td></tr>
                          ) : ingameSlice.map((row, i) => (
                            <tr key={row.rsn} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50">
                              <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{ingamePage * PAGE + i + 1}</td>
                              <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{row.rsn}</td>
                              <td className="px-4 py-2.5 text-right text-sm font-bold text-[#c89b3c]">{row.month_count.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.message_count.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.last_message_at ? new Date(row.last_message_at).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {ingamePages > 1 && (
                      <div className="flex items-center justify-between px-4 py-2 border-t border-[#1a1a30]">
                        <button onClick={() => setIngamePage(p => Math.max(0, p - 1))} disabled={ingamePage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                        <span className="text-xs text-[#4a4a70]">Page {ingamePage + 1} of {ingamePages}</span>
                        <button onClick={() => setIngamePage(p => Math.min(ingamePages - 1, p + 1))} disabled={ingamePage === ingamePages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
                      </div>
                    )}
                  </>)}
                </div>
              </>)}

              {/* VC Activity */}
              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
                <button onClick={() => setVcOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#2a2a4a] hover:bg-[#141427]/50 transition-colors">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Voice Channel Activity {vcActivity.length > 0 && <span className="text-[#4a4a70] normal-case">({vcActivity.length})</span>}</h2>
                  <span className="text-[#4a4a70] text-sm">{vcOpen ? '▲' : '▼'}</span>
                </button>
                {vcOpen && (<>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a1a30]">
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Member</th>
                          <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Role</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">This Month</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">All Time</th>
                          <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Last Seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vcSlice.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#4a4a70]">{activityLoaded ? 'No data yet.' : 'Loading…'}</td></tr>
                        ) : vcSlice.map((row, i) => (
                          <tr key={row.discord_id} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50">
                            <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{vcPage * PAGE + i + 1}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{row.display_name ?? row.discord_id}</td>
                            <td className="px-4 py-2.5 text-xs text-[#7c5ce8]">{row.role_name ?? '—'}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-bold text-[#c89b3c]">{formatMinutes(row.month_minutes)}</td>
                            <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{formatMinutes(row.total_minutes)}</td>
                            <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.last_seen_at ? new Date(row.last_seen_at).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {vcPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-[#1a1a30]">
                      <button onClick={() => setVcPage(p => Math.max(0, p - 1))} disabled={vcPage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                      <span className="text-xs text-[#4a4a70]">Page {vcPage + 1} of {vcPages}</span>
                      <button onClick={() => setVcPage(p => Math.min(vcPages - 1, p + 1))} disabled={vcPage === vcPages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
                    </div>
                  )}
                </>)}
              </div>
            </>)
          })()}

          {toolsTab === 'messenger' && <>
          {/* Send Embed */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Send Embed to Discord</h2>
          <div className="space-y-3 max-w-lg">
            <div>
              <label className="text-xs text-[#7070a0] mb-1 block">Channel</label>
              <select
                value={embedChannel}
                onChange={e => setEmbedChannel(e.target.value)}
                className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none"
              >
                {channels.length === 0
                  ? <option value="">Loading channels…</option>
                  : channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)
                }
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7070a0] mb-1 block">Title</label>
              <input
                value={embedTitle}
                onChange={e => setEmbedTitle(e.target.value)}
                placeholder="Embed title"
                className="w-full rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#3a3a60]"
              />
            </div>
            <div>
              <label className="text-xs text-[#7070a0] mb-1 block">Description</label>
              <div className="rounded-lg border border-[#2a2a4a] bg-[#141427] overflow-hidden">
                <div className="flex flex-wrap gap-px p-1 border-b border-[#2a2a4a] bg-[#0e0e1c]">
                  {([
                    ['H1', '# '], ['H2', '## '], ['H3', '### '],
                  ] as [string, string][]).map(([label, prefix]) => (
                    <button key={label} type="button"
                      onMouseDown={e => { e.preventDefault(); prefixLine(prefix) }}
                      className="px-2.5 py-1 rounded text-xs font-bold text-[#a0a0c0] hover:text-[#e8e8f0] hover:bg-[#2a2a4a] transition-colors">
                      {label}
                    </button>
                  ))}
                  <span className="self-center text-[#2a2a4a] mx-1">|</span>
                  {([
                    ['B', '**', '**', 'font-bold'],
                    ['I', '*', '*', 'italic'],
                    ['U', '__', '__', 'underline'],
                    ['S', '~~', '~~', 'line-through'],
                    ['`', '`', '`', 'font-mono'],
                  ] as [string, string, string, string][]).map(([label, before, after, cls]) => (
                    <button key={label} type="button"
                      onMouseDown={e => { e.preventDefault(); wrapText(before, after) }}
                      className="px-2.5 py-1 rounded text-xs text-[#a0a0c0] hover:text-[#e8e8f0] hover:bg-[#2a2a4a] transition-colors">
                      <span className={cls}>{label}</span>
                    </button>
                  ))}
                  <span className="self-center text-[#2a2a4a] mx-1">|</span>
                  {([
                    ['> ', '> ', ''],
                    ['- ', '- ', ''],
                  ] as [string, string, string][]).map(([label, before, after]) => (
                    <button key={label} type="button"
                      onMouseDown={e => { e.preventDefault(); wrapText(before, after) }}
                      className="px-2.5 py-1 rounded text-xs font-mono text-[#a0a0c0] hover:text-[#e8e8f0] hover:bg-[#2a2a4a] transition-colors">
                      {label}
                    </button>
                  ))}
                  <span className="ml-auto text-[10px] text-[#3a3a60] self-center pr-1">markdown</span>
                </div>
                <textarea
                  ref={descRef}
                  value={embedDesc}
                  onChange={e => setEmbedDesc(e.target.value)}
                  placeholder="Embed description…"
                  rows={5}
                  className="w-full bg-transparent text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#3a3a60] resize-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#7070a0] mb-1 block">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={embedColor} onChange={e => setEmbedColor(e.target.value)}
                  className="h-9 w-12 rounded cursor-pointer bg-transparent border border-[#2a2a4a]" />
                <span className="text-xs text-[#4a4a70]">{embedColor}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={sendEmbed}
                disabled={embedSending || !embedChannel || (!embedTitle && !embedDesc)}
                className="px-4 py-2 rounded-lg bg-[#5865F2] text-white text-sm font-semibold hover:bg-[#4752c4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {embedSending ? 'Sending…' : 'Send Embed'}
              </button>
              {embedStatus && <span className="text-sm text-[#a0a0c0]">{embedStatus}</span>}
            </div>
          </div>
        </div>
          </>}

          {toolsTab === 'events' && (
            <div className="space-y-6">
              {/* Create event */}
              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Schedule Event</h2>
                <div className="grid grid-cols-1 gap-3 max-w-lg">
                  <input value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Event title" className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
                  <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none resize-none focus:border-[#7c5ce8]/60" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={eventType} onChange={e => setEventType(e.target.value)} className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                      {['Event', 'Raid', 'PvM Session', 'Social', 'Competition', 'Other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
                  </div>
                  <select value={eventChannel} onChange={e => setEventChannel(e.target.value)} className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                    {channels.length === 0 ? <option value="">Loading channels…</option> : channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                  </select>
                  <button onClick={createClanEvent} disabled={!eventTitle.trim() || !eventChannel} className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">
                    Post Event + RSVP Buttons
                  </button>
                </div>
              </div>

              {/* Event list */}
              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2a2a4a]">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Upcoming Events {clanEvents.length > 0 && <span className="text-[#4a4a70] normal-case">({clanEvents.length})</span>}</h2>
                </div>
                {clanEvents.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-[#4a4a70]">No events yet.</p>
                ) : clanEvents.map(ev => {
                  const rsvpCount = ev.event_rsvps?.[0]?.count ?? 0
                  const isOpen = rsvpEventId === ev.id
                  return (
                    <div key={ev.id} className="border-b border-[#141427] last:border-0">
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#141427]/50">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[#e8e8f0]">{ev.title}</span>
                          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-[#7c5ce8]/20 text-[#b09cf8]">{ev.event_type}</span>
                          <div className="text-xs text-[#4a4a70] mt-0.5">
                            {ev.scheduled_at ? new Date(ev.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                          </div>
                        </div>
                        <button onClick={() => loadRsvps(ev.id)} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] transition-colors px-2 py-1 rounded border border-[#2a2a4a] hover:border-[#4a4a70]">
                          {rsvpCount} going {isOpen ? '▲' : '▼'}
                        </button>
                        <button onClick={() => deleteEvent(ev.id)} className="text-xs text-[#4a4a70] hover:text-[#ED4245] transition-colors px-2">✕</button>
                      </div>
                      {isOpen && (
                        <div className="px-5 pb-3">
                          {rsvps.length === 0 ? <p className="text-xs text-[#4a4a70]">No RSVPs yet.</p> : (
                            <div className="flex flex-wrap gap-2">
                              {rsvps.map(r => <span key={r.discord_id} className="text-xs px-2 py-1 rounded-full bg-[#141427] text-[#a0a0c0]">{r.display_name ?? r.discord_id}</span>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            {/* Raid scheduling */}
            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2a4a]">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Schedule Raid</h2>
                <p className="text-xs text-[#4a4a70] mt-1">Posts a raid signup embed with Discord buttons. Members click Sign Up / Drop Out in Discord.</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <input value={raidName} onChange={e => setRaidName(e.target.value)} placeholder="Raid name (e.g. Theatre of Blood)" className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
                  <input type="datetime-local" value={raidTimestamp} onChange={e => setRaidTimestamp(e.target.value)} className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
                </div>
                <input value={raidDesc} onChange={e => setRaidDesc(e.target.value)} placeholder="Details / notes (optional)" className="rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
                <div className="flex gap-3">
                  <select value={raidChannel} onChange={e => setRaidChannel(e.target.value)} className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                    {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                  </select>
                  <button onClick={scheduleRaid} disabled={!raidName.trim() || !raidTimestamp || !raidChannel} className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">
                    Schedule Raid
                  </button>
                </div>
              </div>
            </div>

            {raids.length > 0 && (
              <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2a2a4a]">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Upcoming Raids <span className="text-[#4a4a70] normal-case">({raids.length})</span></h2>
                </div>
                <div className="divide-y divide-[#141427]">
                  {raids.map(raid => (
                    <div key={raid.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#e8e8f0]">{raid.name}</div>
                        <div className="text-xs text-[#4a4a70] mt-0.5">
                          {new Date(raid.timestamp * 1000).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          <span className="text-[#7c5ce8]">{raid.signups?.length ?? 0} signed up</span>
                          {raid.attendees && <span className="text-[#57F287] ml-2">✓ Complete</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}

          {toolsTab === 'settings' && (
            <>
            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2a4a]">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Bot Channel Settings</h2>
                <p className="text-xs text-[#4a4a70] mt-1">Changes save immediately on selection.</p>
              </div>
              <div className="px-5">
                {([
                  ['TrackScape Clan Chat', 'clanchat_channel_id', 'In-game clan chat relay'],
                  ['TrackScape Broadcasts', 'broadcast_channel_id', 'Drops, pets, achievements'],
                  ['Planks Channel', 'planks_channel_id', 'Death notifications (Dink)'],
                  ['Drops Channel', 'drops_channel_id', 'Loot drops (Dink)'],
                  ['Loot Submit Channel', 'lootsubmit_channel_id', 'Staff review for manual submissions'],
                  ['Welcome Channel', 'welcome_channel_id', 'New member welcome messages'],
                  ['Welcome Mod Channel', 'welcome_mod_channel_id', 'Staff review for welcomes'],
                  ['Weekly Recap Channel', 'recap_channel_id', 'Sunday activity recap post'],
                  ['Inactivity Alerts Channel', 'inactivity_channel_id', 'Monday inactive members list'],
                ] as [string, keyof GuildConfig, string][]).map(([label, key, hint]) => (
                  <div key={key} className="flex items-center gap-4 py-3 border-b border-[#141427] last:border-0">
                    <div className="w-52 shrink-0">
                      <div className="text-sm text-[#c0c0e0]">{label}</div>
                      <div className="text-xs text-[#4a4a70] mt-0.5">{hint}</div>
                    </div>
                    <select
                      value={guildConfig[key] ?? ''}
                      onChange={e => saveConfig({ [key]: e.target.value || null })}
                      className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60"
                    >
                      <option value="">— Not set —</option>
                      {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2a4a]">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Role Settings</h2>
                <p className="text-xs text-[#4a4a70] mt-1">Changes save immediately on selection.</p>
              </div>
              <div className="px-5">
                <div className="flex items-center gap-4 py-3">
                  <div className="w-52 shrink-0">
                    <div className="text-sm text-[#c0c0e0]">Welcome Role</div>
                    <div className="text-xs text-[#4a4a70] mt-0.5">Granted when a new member agrees to rules</div>
                  </div>
                  <select
                    value={guildConfig.welcome_role_id ?? ''}
                    onChange={e => saveConfig({ welcome_role_id: e.target.value || null })}
                    className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60"
                  >
                    <option value="">— Not set —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Welcome Panel */}
            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2a4a]">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Welcome Panel</h2>
                <p className="text-xs text-[#4a4a70] mt-1">Posts the clan rules embed with an "I Agree" button. Set Welcome Channel above first.</p>
              </div>
              <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-[#a0a0c0]">
                  {guildConfig.welcome_channel_id
                    ? <>Posting to <span className="text-[#c89b3c]">#{channels.find(c => c.id === guildConfig.welcome_channel_id)?.name ?? guildConfig.welcome_channel_id}</span></>
                    : <span className="text-[#4a4a70]">Welcome channel not set</span>}
                </span>
                <button
                  onClick={postWelcomeMessage}
                  disabled={!guildConfig.welcome_channel_id || welcomePosting}
                  className="ml-auto px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40"
                >
                  {welcomePosting ? 'Posting…' : 'Post Welcome Message'}
                </button>
                {welcomeStatus && <span className="text-xs text-[#a0a0c0] w-full">{welcomeStatus}</span>}
              </div>
            </div>

            {/* Role Panel */}
            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2a4a]">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Role Panel</h2>
                <p className="text-xs text-[#4a4a70] mt-1">Manage role self-assignment buttons. Adding or removing a role auto-updates the Discord message.</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-4">
                {rolePanel.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rolePanel.roles.map(r => (
                      <div key={r.roleId} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#141427] border border-[#2a2a4a] text-sm text-[#c0c0e0]">
                        <span>{r.emoji}</span><span>{r.label}</span>
                        <button onClick={() => removePanelRole(r.roleId)} className="text-[#4a4a70] hover:text-[#ED4245] transition-colors ml-1 leading-none">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <select value={panelRole} onChange={e => setPanelRole(e.target.value)} className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                    <option value="">Select role…</option>
                    {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
                  </select>
                  <input value={panelEmoji} onChange={e => setPanelEmoji(e.target.value)} placeholder="Emoji" className="w-20 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
                  <input value={panelLabel} onChange={e => setPanelLabel(e.target.value)} placeholder="Label (optional)" className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
                  <button onClick={addPanelRole} disabled={!panelRole || !panelEmoji.trim()} className="px-3 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] disabled:opacity-40">Add</button>
                </div>
                <div className="flex gap-2 pt-1 border-t border-[#141427]">
                  <select value={panelChannel} onChange={e => setPanelChannel(e.target.value)} className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                    <option value="">Select channel to post to…</option>
                    {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                  </select>
                  <button onClick={postRolePanel} disabled={!panelChannel} className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] disabled:opacity-40">
                    {rolePanel.messageId ? 'Repost Panel' : 'Post Panel'}
                  </button>
                </div>
                {rolePanel.channelId && (
                  <p className="text-xs text-[#4a4a70]">
                    Currently posted in #{channels.find(c => c.id === rolePanel.channelId)?.name ?? rolePanel.channelId}
                  </p>
                )}
              </div>
            </div>

            {/* Loot Scrape */}
            <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2a2a4a]">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Loot History Scrape</h2>
                <p className="text-xs text-[#4a4a70] mt-1">Re-scan the drops channel and import any missed entries. Automatically skips duplicates.</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#1a1020] border border-[#c89b3c]/30 text-xs text-[#c89b3c]">
                  <span className="text-base mt-0.5 shrink-0">⚠️</span>
                  <span>This fetches every message in the drops channel from Discord. Large channels may take several minutes. Run once for a full backfill — the bot handles new drops automatically going forward.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => scrapeHistory('month')}
                    disabled={scrapeRunning || !guildConfig.drops_channel_id}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#141427] border border-[#2a2a4a] text-[#c0c0e0] text-sm hover:border-[#7c5ce8]/60 transition-colors disabled:opacity-40"
                  >
                    {scrapeRunning ? 'Scraping…' : 'Scrape This Month'}
                  </button>
                  <button
                    onClick={() => scrapeHistory('all')}
                    disabled={scrapeRunning || !guildConfig.drops_channel_id}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#141427] border border-[#ED4245]/40 text-[#c0c0e0] text-sm hover:border-[#ED4245]/80 transition-colors disabled:opacity-40"
                  >
                    {scrapeRunning ? 'Scraping…' : 'Scrape All Time ⚠️'}
                  </button>
                </div>
                {scrapeStatus && <p className="text-xs text-[#a0a0c0]">{scrapeStatus}</p>}
                {!guildConfig.drops_channel_id && <p className="text-xs text-[#4a4a70]">Set Drops Channel above to enable scraping.</p>}
              </div>
            </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
