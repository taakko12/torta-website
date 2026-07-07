'use client'
import { useState } from 'react'
import type { ClanEvent, Raid, Channel } from '../_lib/data'
import type { Competition, CompetitionWithStandings } from '@/lib/wom'
import { formatMetric } from '@/lib/wom'

type Rsvp = { discord_id: string; display_name: string | null; rsvped_at: string }
type Props = {
  initialEvents: ClanEvent[]
  initialRaids: Raid[]
  channels: Channel[]
  activeComps: CompetitionWithStandings[]
  upcomingComps: Competition[]
}

export default function EventsPanel({ initialEvents, initialRaids, channels, activeComps, upcomingComps }: Props) {
  const [clanEvents, setClanEvents] = useState<ClanEvent[]>(initialEvents)
  const [raids, setRaids] = useState<Raid[]>(initialRaids)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventType, setEventType] = useState('Event')
  const [eventDateD, setEventDateD] = useState('')
  const [eventDateT, setEventDateT] = useState('')
  const [eventChannel, setEventChannel] = useState(channels[0]?.id ?? '')
  const [rsvpEventId, setRsvpEventId] = useState<string | null>(null)
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [raidName, setRaidName] = useState('')
  const [raidDate, setRaidDate] = useState('')
  const [raidTime, setRaidTime] = useState('')
  const [raidDesc, setRaidDesc] = useState('')
  const [raidChannel, setRaidChannel] = useState(channels[0]?.id ?? '')

  async function createClanEvent() {
    if (!eventTitle.trim() || !eventChannel) return
    const res = await fetch('/api/admin/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: eventTitle, description: eventDesc, event_type: eventType, scheduled_at: eventDateD && eventDateT ? `${eventDateD}T${eventDateT}` : null, channel_id: eventChannel }),
    })
    if (res.ok) {
      const { event } = await res.json()
      setClanEvents(ev => [...ev, { ...event, event_rsvps: [{ count: 0 }] }])
      setEventTitle(''); setEventDesc(''); setEventDateD(''); setEventDateT('')
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

  async function scheduleRaid() {
    if (!raidName.trim() || !raidDate || !raidTime || !raidChannel) return
    const timestamp = Math.floor(new Date(`${raidDate}T${raidTime}`).getTime() / 1000)
    const res = await fetch('/api/admin/raids', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: raidName.trim(), timestamp, description: raidDesc || null, channel_id: raidChannel }),
    })
    if (res.ok) {
      const data = await res.json()
      setRaids(r => [...r, data.raid].sort((a, b) => a.timestamp - b.timestamp))
      setRaidName(''); setRaidDate(''); setRaidTime(''); setRaidDesc('')
    }
  }

  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'
  const card = 'rounded-xl border border-[#333358] bg-[#161628]'

  return (
    <div className="space-y-6">

      {/* WOM Competitions (read-only) */}
      {(activeComps.length > 0 || upcomingComps.length > 0) && (
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#57F287]">⚔️ WOM Competitions</h2>
            <span className="text-[10px] text-[#4a4a70]">Managed via Wise Old Man</span>
          </div>
          <div className="space-y-2">
            {activeComps.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0f1f15] border border-[#57F287]/20">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#57F287]/15 text-[#57F287]">LIVE</span>
                <span className="text-sm font-medium text-[#e8e8f0] flex-1">{c.title}</span>
                <span className="text-xs text-[#7070a0]">{formatMetric(c.metric)}</span>
                <span className="text-xs text-[#4a4a70]">ends {new Date(c.endsAt).toLocaleDateString()}</span>
              </div>
            ))}
            {upcomingComps.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#1c1c36] border border-[#333358]">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4a4a70]/20 text-[#7070a0]">SOON</span>
                <span className="text-sm font-medium text-[#e8e8f0] flex-1">{c.title}</span>
                <span className="text-xs text-[#7070a0]">{formatMetric(c.metric)}</span>
                <span className="text-xs text-[#4a4a70]">starts {new Date(c.startsAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Event */}
      <div className={`${card} p-5`}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Schedule Event</h2>
        <div className="grid grid-cols-1 gap-3 max-w-lg">
          <input value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Event title" className={inp} />
          <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Description (optional)" rows={2} className={`${inp} resize-none`} />
          <select value={eventType} onChange={e => setEventType(e.target.value)} className={inp}>
            {['Event', 'Raid', 'PvM Session', 'Social', 'Competition', 'Other'].map(t => <option key={t}>{t}</option>)}
          </select>
          <div>
            <label className="text-xs text-[#7070a0] mb-1 block">Date &amp; Time</label>
            <div className="flex gap-2">
              <input type="date" value={eventDateD} onChange={e => setEventDateD(e.target.value)} className={`flex-1 [color-scheme:dark] ${inp}`} />
              <input type="time" value={eventDateT} onChange={e => setEventDateT(e.target.value)} className={`w-32 [color-scheme:dark] ${inp}`} />
            </div>
          </div>
          <select value={eventChannel} onChange={e => setEventChannel(e.target.value)} className={inp}>
            {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>
          <button onClick={createClanEvent} disabled={!eventTitle.trim() || !eventChannel}
            className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">
            Post Event + RSVP Buttons
          </button>
        </div>
      </div>

      {/* Event List */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Upcoming Events {clanEvents.length > 0 && <span className="text-[#4a4a70] normal-case">({clanEvents.length})</span>}</h2>
        </div>
        {clanEvents.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#4a4a70]">No events yet.</p>
        ) : clanEvents.map(ev => {
          const rsvpCount = ev.event_rsvps?.[0]?.count ?? 0
          const isOpen = rsvpEventId === ev.id
          return (
            <div key={ev.id} className="border-b border-[#1c1c36] last:border-0">
              <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#1c1c36]/50">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[#e8e8f0]">{ev.title}</span>
                  <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-[#7c5ce8]/20 text-[#b09cf8]">{ev.event_type}</span>
                  <div className="text-xs text-[#4a4a70] mt-0.5">
                    {ev.scheduled_at ? new Date(ev.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                  </div>
                </div>
                <button onClick={() => loadRsvps(ev.id)} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] px-2 py-1 rounded border border-[#333358] hover:border-[#4a4a70]">
                  {rsvpCount} going {isOpen ? '▲' : '▼'}
                </button>
                <button onClick={() => deleteEvent(ev.id)} className="text-xs text-[#4a4a70] hover:text-[#ED4245] px-2">✕</button>
              </div>
              {isOpen && (
                <div className="px-5 pb-3">
                  {rsvps.length === 0 ? <p className="text-xs text-[#4a4a70]">No RSVPs yet.</p> : (
                    <div className="flex flex-wrap gap-2">
                      {rsvps.map(r => <span key={r.discord_id} className="text-xs px-2 py-1 rounded-full bg-[#1c1c36] text-[#a0a0c0]">{r.display_name ?? r.discord_id}</span>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Schedule Raid */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Schedule Raid</h2>
          <p className="text-xs text-[#4a4a70] mt-1">Posts a raid signup embed with Discord buttons.</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <input value={raidName} onChange={e => setRaidName(e.target.value)} placeholder="Raid name (e.g. Theatre of Blood)" className={`flex-1 min-w-[180px] ${inp}`} />
            <input type="date" value={raidDate} onChange={e => setRaidDate(e.target.value)} className={`[color-scheme:dark] ${inp}`} />
            <input type="time" value={raidTime} onChange={e => setRaidTime(e.target.value)} className={`w-32 [color-scheme:dark] ${inp}`} />
          </div>
          <input value={raidDesc} onChange={e => setRaidDesc(e.target.value)} placeholder="Details / notes (optional)" className={inp} />
          <div className="flex gap-3">
            <select value={raidChannel} onChange={e => setRaidChannel(e.target.value)} className={`flex-1 ${inp}`}>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
            <button onClick={scheduleRaid} disabled={!raidName.trim() || !raidDate || !raidTime || !raidChannel}
              className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] disabled:opacity-40">Schedule Raid</button>
          </div>
        </div>
      </div>

      {raids.length > 0 && (
        <div className={`${card} overflow-hidden`}>
          <div className="px-5 py-3 border-b border-[#333358]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Upcoming Raids <span className="text-[#4a4a70] normal-case">({raids.length})</span></h2>
          </div>
          <div className="divide-y divide-[#1c1c36]">
            {raids.map(raid => (
              <div key={raid.id} className="px-5 py-3">
                <div className="text-sm font-medium text-[#e8e8f0]">{raid.name}</div>
                <div className="text-xs text-[#4a4a70] mt-0.5">
                  {new Date(raid.timestamp * 1000).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}<span className="text-[#7c5ce8]">{raid.signups?.length ?? 0} signed up</span>
                  {raid.attendees && <span className="text-[#57F287] ml-2">✓ Complete</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
