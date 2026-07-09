'use client'
import { useState } from 'react'
import type { Promotion, Role } from '../_lib/data'

type Member = { discord_id: string; display_name: string; rsn: string | null; role_name: string | null }
type Props = { initialPromotions: Promotion[]; roles: Role[]; members: Member[] }

export default function PromotionsPanel({ initialPromotions, roles, members }: Props) {
  const [promotions, setPromotions] = useState(initialPromotions)
  const [selectedId, setSelectedId] = useState('')
  const [toRoleId, setToRoleId] = useState(roles[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const selected = members.find(m => m.discord_id === selectedId) ?? null
  const fromRoleId = roles.find(r => r.name === selected?.role_name)?.id ?? ''
  const fromRoleName = roles.find(r => r.id === fromRoleId)?.name ?? selected?.role_name ?? ''
  const toRoleName = roles.find(r => r.id === toRoleId)?.name ?? ''

  async function add() {
    if (!selectedId || !toRoleId) return
    setSaving(true); setStatus(null)
    const res = await fetch('/api/admin/promotions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discord_id: selected!.discord_id,
        display_name: selected!.display_name,
        rsn: selected!.rsn,
        from_role: fromRoleName,
        to_role: toRoleName,
        from_role_id: fromRoleId || null,
        to_role_id: toRoleId,
        notes: notes || null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setPromotions(prev => [data.promotion, ...prev])
      setSelectedId(''); setNotes('')
      setStatus(data.roleSwapped ? '✅ Promoted and Discord role updated' : '✅ Logged (role swap skipped — check Discord IDs)')
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

        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Member</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
            <option value="">— select a member —</option>
            {members.map(m => (
              <option key={m.discord_id} value={m.discord_id}>
                {m.display_name}{m.rsn ? ` (${m.rsn})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="rounded-lg bg-[#1c1c36] border border-[#333358] px-4 py-3 text-xs text-[#7878a8] flex gap-4">
            <span>Discord: <span className="text-[#9898c0]">{selected.display_name}</span></span>
            {selected.rsn && <span>RSN: <span className="text-[#9898c0]">{selected.rsn}</span></span>}
            <span>Current rank: <span className="text-[#c89b3c]">{selected.role_name ?? 'none'}</span></span>
          </div>
        )}

        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[130px]">
            <label className="text-xs text-[#9898c0] mb-1 block">From Rank</label>
            <div className="rounded-lg bg-[#111122] border border-[#333358] text-[#7878a8] px-3 py-2 text-sm">
              {fromRoleName || <span className="text-[#424268]">auto-detected</span>}
            </div>
          </div>
          <span className="text-[#7878a8] pb-2">→</span>
          <div className="flex-1 min-w-[130px]">
            <label className="text-xs text-[#9898c0] mb-1 block">To Rank</label>
            <select value={toRoleId} onChange={e => setToRoleId(e.target.value)}
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-[#9898c0] mb-1 block">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 3 months active"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={add} disabled={saving || !selectedId || !toRoleId}
            className="px-4 py-2 rounded-lg bg-[#57F287] text-[#0f0f1e] text-sm font-semibold hover:bg-[#3dd470] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Promoting…' : 'Promote'}
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
