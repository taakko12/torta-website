'use client'
import { useState, useEffect } from 'react'

type Application = {
  id: number; rsn: string; discord_username: string | null; timezone: string | null
  about: string; why: string; status: string; notes: string | null
  created_at: string; reviewed_at: string | null; reviewed_by: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-[#c89b3c]/15 text-[#c89b3c]',
  accepted: 'bg-[#57F287]/15 text-[#57F287]',
  rejected: 'bg-[#ED4245]/15 text-[#ED4245]',
  waitlist: 'bg-[#7c8cf8]/15 text-[#7c8cf8]',
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  useEffect(() => {
    fetch('/api/admin/applications').then(r => r.json()).then(d => { setApps(d); setLoading(false) })
  }, [])

  async function setStatus(id: number, status: string) {
    await fetch('/api/admin/applications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, notes: notes[id] }),
    })
    setApps(as => as.map(a => a.id === id ? { ...a, status, notes: notes[id] ?? a.notes } : a))
    setExpanded(null)
  }

  async function deleteApp(id: number) {
    await fetch('/api/admin/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setApps(as => as.filter(a => a.id !== id))
  }

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)
  const pendingCount = apps.filter(a => a.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {['pending', 'accepted', 'rejected', 'waitlist', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition-colors ${filter === s ? 'border-[#7c5ce8] bg-[#7c5ce8]/15 text-[#b09cf8]' : 'border-[#333358] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            {s}{s === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#7878a8] py-8 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#333358] bg-[#161628] py-12 text-center text-sm text-[#7878a8]">
          No {filter === 'all' ? '' : filter} applications.
        </div>
      ) : (
        <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
          <ul className="divide-y divide-[#1c1c36]">
            {filtered.map(app => (
              <li key={app.id}>
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1c1c36]/50 cursor-pointer"
                  onClick={() => setExpanded(expanded === app.id ? null : app.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#e8e8f0]">{app.rsn}</span>
                      {app.discord_username && <span className="text-xs text-[#7878a8]">@{app.discord_username}</span>}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${STATUS_COLORS[app.status] ?? STATUS_COLORS.pending}`}>{app.status}</span>
                    </div>
                    <div className="text-xs text-[#5a5a7a] flex items-center gap-3">
                      {app.timezone && <span>{app.timezone}</span>}
                      <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="text-[#5a5a7a] text-xs">{expanded === app.id ? '▲' : '▼'}</span>
                </div>
                {expanded === app.id && (
                  <div className="px-5 pb-4 space-y-3 border-t border-[#1c1c36]">
                    <div className="pt-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8] mb-1">About</p>
                        <p className="text-sm text-[#9898c0] whitespace-pre-wrap">{app.about}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8] mb-1">Why Torta</p>
                        <p className="text-sm text-[#9898c0] whitespace-pre-wrap">{app.why}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8] mb-1">Notes (internal)</p>
                        <textarea
                          value={notes[app.id] ?? app.notes ?? ''}
                          onChange={e => setNotes(n => ({ ...n, [app.id]: e.target.value }))}
                          rows={2} placeholder="Staff notes…"
                          className="w-full rounded-lg bg-[#21213c] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60 placeholder:text-[#424268] resize-none" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setStatus(app.id, 'accepted')}
                          className="px-3 py-1.5 rounded-lg bg-[#57F287]/20 text-[#57F287] text-xs font-semibold hover:bg-[#57F287]/30 transition-colors">
                          ✓ Accept
                        </button>
                        <button onClick={() => setStatus(app.id, 'waitlist')}
                          className="px-3 py-1.5 rounded-lg bg-[#7c8cf8]/20 text-[#7c8cf8] text-xs font-semibold hover:bg-[#7c8cf8]/30 transition-colors">
                          ⏸ Waitlist
                        </button>
                        <button onClick={() => setStatus(app.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-[#ED4245]/20 text-[#ED4245] text-xs font-semibold hover:bg-[#ED4245]/30 transition-colors">
                          ✕ Reject
                        </button>
                        <button onClick={() => deleteApp(app.id)}
                          className="ml-auto px-3 py-1.5 rounded-lg text-xs text-[#5a5a7a] hover:text-[#ED4245] transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
