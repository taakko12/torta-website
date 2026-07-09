'use client'
import { useState } from 'react'
import type { Promotion } from '../_lib/data'

export default function PromotionsPanel({ initialPromotions, roles }: { initialPromotions: Promotion[]; roles: string[] }) {
  const [promotions, setPromotions] = useState(initialPromotions)
  const [discordId, setDiscordId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [rsn, setRsn] = useState('')
  const [fromRole, setFromRole] = useState(roles[0] ?? '')
  const [toRole, setToRole] = useState(roles[1] ?? '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  async function add() {
    if (!fromRole || !toRole) return
    setSaving(true); setStatus(null)
    const res = await fetch('/api/admin/promotions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: discordId || null, display_name: displayName || null, rsn: rsn || null, from_role: fromRole, to_role: toRole, notes: notes || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setPromotions(prev => [data.promotion, ...prev])
      setDiscordId(''); setDisplayName(''); setRsn(''); setNotes('')
      setStatus('✅ Promotion logged')
    } else setStatus(`❌ ${data.error}`)
    setSaving(false)
  }

  async function remove(id: number) {
    setDeleting(id)
    await fetch('/api/admin/promotions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPromotions(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  const filtered = promotions.filter(p => !search ||
    (p.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.rsn ?? '').includes(search.toLowerCase()) ||
    p.from_role.toLowerCase().includes(search.toLowerCase()) ||
    p.to_role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5 space-y-4 max-w-2xl">
        <h2 className="text-sm font-semibold text-[#e8e8f0]">Log Promotion</h2>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-[#9898c0] mb-1 block">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Discord username"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-[#9898c0] mb-1 block">RSN</label>
            <input value={rsn} onChange={e => setRsn(e.target.value)} placeholder="In-game name"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-[#9898c0] mb-1 block">Discord ID (optional)</label>
            <input value={discordId} onChange={e => setDiscordId(e.target.value)} placeholder="e.g. 123456789"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-[#9898c0] mb-1 block">From Rank</label>
            <select value={fromRole} onChange={e => setFromRole(e.target.value)}
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
              {roles.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <span className="text-[#7878a8] pb-2">→</span>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-[#9898c0] mb-1 block">To Rank</label>
            <select value={toRole} onChange={e => setToRole(e.target.value)}
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
              {roles.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-[#9898c0] mb-1 block">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 3 months active"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={saving || !fromRole || !toRole}
            className="px-4 py-2 rounded-lg bg-[#57F287] text-[#0f0f1e] text-sm font-semibold hover:bg-[#3dd470] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Log Promotion'}
          </button>
          {status && <span className="text-sm text-[#a0a0c0]">{status}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358] flex items-center gap-3">
          <span className="text-sm font-semibold text-[#e8e8f0]">Promotion Log</span>
          <span className="text-xs text-[#7878a8]">{promotions.length} total</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="ml-auto rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-1.5 text-xs outline-none placeholder:text-[#424268] w-40" />
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No promotions logged.</p>
        ) : (
          <ul className="divide-y divide-[#1c1c36]">
            {filtered.map(p => (
              <li key={p.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#e8e8f0]">{p.display_name ?? p.rsn ?? p.discord_id ?? '?'}</span>
                    {p.rsn && p.display_name && <span className="text-xs text-[#7878a8]">({p.rsn})</span>}
                    <span className="text-xs text-[#7878a8]">{p.from_role}</span>
                    <span className="text-xs text-[#57F287]">→ {p.to_role}</span>
                    {p.notes && <span className="text-xs text-[#5a5a7a]">· {p.notes}</span>}
                  </div>
                  <p className="text-xs text-[#5a5a7a] mt-0.5">
                    {new Date(p.promoted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {p.promoted_by_name && ` · by ${p.promoted_by_name}`}
                  </p>
                </div>
                <button onClick={() => remove(p.id)} disabled={deleting === p.id}
                  className="text-xs text-[#7878a8] hover:text-[#ED4245] transition-colors disabled:opacity-40 shrink-0">
                  {deleting === p.id ? '…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
