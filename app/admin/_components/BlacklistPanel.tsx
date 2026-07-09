'use client'
import { useState } from 'react'
import type { BlacklistEntry } from '../_lib/data'

export default function BlacklistPanel({ initialEntries }: { initialEntries: BlacklistEntry[] }) {
  const [entries, setEntries] = useState(initialEntries)
  const [discordId, setDiscordId] = useState('')
  const [rsn, setRsn] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  async function add() {
    if (!reason.trim() || (!discordId.trim() && !rsn.trim())) return
    setSaving(true); setStatus(null)
    const res = await fetch('/api/admin/blacklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: discordId || null, rsn: rsn || null, reason }),
    })
    const data = await res.json()
    if (res.ok) {
      setEntries(prev => [data.entry, ...prev])
      setDiscordId(''); setRsn(''); setReason('')
      setStatus('✅ Added to blacklist')
    } else setStatus(`❌ ${data.error}`)
    setSaving(false)
  }

  async function remove(id: number) {
    setDeleting(id)
    await fetch('/api/admin/blacklist', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeleting(null)
  }

  const filtered = entries.filter(e =>
    !search || (e.rsn ?? '').includes(search.toLowerCase()) ||
    (e.discord_id ?? '').includes(search) ||
    e.reason.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5 space-y-4 max-w-2xl">
        <h2 className="text-sm font-semibold text-[#e8e8f0]">Add to Blacklist</h2>
        <p className="text-xs text-[#7878a8]">Mods are warned during welcome approval if a new applicant matches a blacklisted RSN or Discord ID.</p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-[#9898c0] mb-1 block">RSN</label>
            <input value={rsn} onChange={e => setRsn(e.target.value)} placeholder="e.g. Zezima"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-[#9898c0] mb-1 block">Discord ID</label>
            <input value={discordId} onChange={e => setDiscordId(e.target.value)} placeholder="e.g. 123456789"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Reason <span className="text-[#ED4245]">*</span></label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why was this member removed?"
            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={saving || !reason.trim() || (!discordId.trim() && !rsn.trim())}
            className="px-4 py-2 rounded-lg bg-[#ED4245] text-white text-sm font-semibold hover:bg-[#c03537] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Adding…' : 'Add to Blacklist'}
          </button>
          {status && <span className="text-sm text-[#a0a0c0]">{status}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358] flex items-center gap-3">
          <span className="text-sm font-semibold text-[#e8e8f0]">Blacklist</span>
          <span className="text-xs text-[#7878a8]">{entries.length} entries</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="ml-auto rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-1.5 text-xs outline-none placeholder:text-[#424268] w-40" />
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">{entries.length === 0 ? 'No blacklist entries.' : 'No matches.'}</p>
        ) : (
          <ul className="divide-y divide-[#1c1c36]">
            {filtered.map(e => (
              <li key={e.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    {e.rsn && <span className="text-sm font-semibold text-[#e8e8f0]">{e.rsn}</span>}
                    {e.discord_id && <span className="text-xs font-mono text-[#7878a8]">{e.discord_id}</span>}
                  </div>
                  <p className="text-sm text-[#ED4245]">{e.reason}</p>
                  <p className="text-xs text-[#5a5a7a] mt-1">
                    {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {e.removed_by_name && ` · by ${e.removed_by_name}`}
                  </p>
                </div>
                <button onClick={() => remove(e.id)} disabled={deleting === e.id}
                  className="text-xs text-[#7878a8] hover:text-[#ED4245] transition-colors disabled:opacity-40 shrink-0 mt-0.5">
                  {deleting === e.id ? '…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
