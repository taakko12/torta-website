'use client'
import { useState, useEffect } from 'react'
import type { Drop } from '../_lib/data'

function gpFormat(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

type Submission = { id: number; rsn: string; item_name: string; gp_value: number; screenshot_url: string | null; notes: string | null; status: string; created_at: string }

export default function LootPanel({ drops: initialDrops }: { drops: Drop[] }) {
  const [tab, setTab] = useState<'drops' | 'submissions'>('drops')
  const [search, setSearch] = useState('')
  const [minGp, setMinGp] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [subsLoaded, setSubsLoaded] = useState(false)
  const [drops, setDrops] = useState<Drop[]>(initialDrops)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editGp, setEditGp] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)

  function startEdit(d: Drop) {
    setEditingId(d.id)
    setEditGp(String(d.gp_value))
  }

  async function saveEdit(id: number) {
    const gp = Number(editGp)
    if (!gp || gp < 1) { setEditingId(null); return }
    setSavingId(id)
    await fetch('/api/admin/drops', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, gp_value: gp }),
    })
    setDrops(ds => ds.map(d => d.id === id ? { ...d, gp_value: gp } : d))
    setSavingId(null)
    setEditingId(null)
  }

  useEffect(() => {
    if (tab !== 'submissions' || subsLoaded) return
    fetch('/api/admin/drop-submissions').then(r => r.json()).then(d => { setSubmissions(d); setSubsLoaded(true) })
  }, [tab, subsLoaded])

  async function reviewSub(id: number, action: 'approve' | 'reject') {
    await fetch('/api/admin/drop-submissions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setSubmissions(ss => ss.map(s => s.id === id ? { ...s, status: action === 'approve' ? 'approved' : 'rejected' } : s))
  }

  async function deleteSub(id: number) {
    await fetch('/api/admin/drop-submissions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setSubmissions(ss => ss.filter(s => s.id !== id))
  }

  const pendingSubs = submissions.filter(s => s.status === 'pending').length

  const filtered = drops.filter(d => {
    const min = parseInt(minGp) || 0
    if (d.gp_value < min) return false
    if (!search) return true
    return d.player_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.item_name ?? '').toLowerCase().includes(search.toLowerCase())
  })

  const totalGp = filtered.reduce((s, d) => s + d.gp_value, 0)

  const tabCls = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-[#c89b3c] text-[#c89b3c]' : 'border-transparent text-[#7878a8] hover:text-[#e8e8f0]'}`

  return (
    <div className="space-y-4">
      <div className="flex border-b border-[#333358] rounded-t-xl overflow-hidden bg-[#161628]">
        <button className={tabCls('drops')} onClick={() => setTab('drops')}>All Drops</button>
        <button className={tabCls('submissions')} onClick={() => setTab('submissions')}>
          Submissions{pendingSubs > 0 ? ` (${pendingSubs})` : ''}
        </button>
      </div>

      {tab === 'submissions' && (
        <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
          {!subsLoaded ? (
            <p className="px-5 py-8 text-center text-sm text-[#7878a8]">Loading…</p>
          ) : submissions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-[#1c1c36]">
              {submissions.map(s => (
                <li key={s.id} className="px-5 py-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-[#e8e8f0]">{s.rsn}</span>
                        <span className="text-xs text-[#c89b3c] font-mono">{gpFormat(s.gp_value)}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${s.status === 'approved' ? 'bg-[#57F287]/15 text-[#57F287]' : s.status === 'rejected' ? 'bg-[#ED4245]/15 text-[#ED4245]' : 'bg-[#c89b3c]/15 text-[#c89b3c]'}`}>{s.status}</span>
                      </div>
                      <p className="text-xs text-[#9898c0]">{s.item_name}</p>
                      {s.notes && <p className="text-xs text-[#5a5a7a] mt-0.5">{s.notes}</p>}
                      {s.screenshot_url && (
                        <a href={s.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#5865F2] hover:text-[#9da8fa]">view screenshot</a>
                      )}
                    </div>
                    {s.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => reviewSub(s.id, 'approve')} className="text-xs px-2 py-1 rounded bg-[#57F287]/20 text-[#57F287] hover:bg-[#57F287]/30">Approve</button>
                        <button onClick={() => reviewSub(s.id, 'reject')} className="text-xs px-2 py-1 rounded bg-[#ED4245]/20 text-[#ED4245] hover:bg-[#ED4245]/30">Reject</button>
                      </div>
                    )}
                    {s.status !== 'pending' && (
                      <button onClick={() => deleteSub(s.id)} className="text-xs text-[#5a5a7a] hover:text-[#ED4245]">✕</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'drops' && <><div className="flex gap-3 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player or item…"
          className="rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] w-56" />
        <input value={minGp} onChange={e => setMinGp(e.target.value)} placeholder="Min GP (e.g. 1000000)"
          className="rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] w-44" />
        <span className="text-xs text-[#7878a8]">{filtered.length} drops · {gpFormat(totalGp)} gp total</span>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333358] text-xs text-[#7878a8]">
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-right">GP Value</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c36]">
              {filtered.slice(0, 150).map(d => (
                <tr key={d.id} className="hover:bg-[#1c1c36] transition-colors">
                  <td className="px-4 py-2 font-medium text-[#e8e8f0]">{d.player_name}</td>
                  <td className="px-4 py-2 text-[#9898c0]">{d.item_name ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {editingId === d.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          autoFocus
                          value={editGp}
                          onChange={e => setEditGp(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(d.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="w-32 rounded bg-[#1c1c36] border border-[#7c5ce8]/60 text-[#e8e8f0] px-2 py-0.5 text-xs outline-none text-right"
                        />
                        <button onClick={() => saveEdit(d.id)} disabled={savingId === d.id}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#57F287]/20 text-[#57F287] hover:bg-[#57F287]/30 disabled:opacity-40">
                          {savingId === d.id ? '…' : '✓'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-[10px] px-1.5 py-0.5 rounded text-[#5a5a7a] hover:text-[#ED4245]">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(d)} className="text-[#c89b3c] hover:text-[#e8be5a] transition-colors group">
                        {gpFormat(d.gp_value)}
                        <span className="ml-1 text-[10px] text-[#424268] group-hover:text-[#5a5a7a] opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[#5a5a7a] whitespace-nowrap">
                    {new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-2">
                    {(d.image_url || d.screenshot_url) ? (
                      <a href={d.screenshot_url ?? d.image_url!} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#5865F2] hover:text-[#9da8fa] transition-colors">view</a>
                    ) : <span className="text-xs text-[#424268]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 150 && (
            <p className="px-4 py-3 text-xs text-[#7878a8] border-t border-[#333358]">Showing 150 of {filtered.length}. Use search/filter to narrow results.</p>
          )}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[#7878a8]">No drops match your filters.</p>
          )}
        </div>
      </div></>}
    </div>
  )
}
