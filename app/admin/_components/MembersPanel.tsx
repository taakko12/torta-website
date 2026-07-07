'use client'
import { useState, useMemo } from 'react'
import type { LinkRow, DiscordActivity, IngameActivity } from '../_lib/data'

type Props = { initialLinks: LinkRow[]; discordActivity: DiscordActivity[]; ingameActivity: IngameActivity[] }

export default function MembersPanel({ initialLinks, discordActivity, ingameActivity }: Props) {
  const [links, setLinks] = useState<LinkRow[]>(initialLinks)
  const [linkSearch, setLinkSearch] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null) // `${discord_id}:${rsn}`
  const [editRsn, setEditRsn] = useState('')
  const [linkDiscordId, setLinkDiscordId] = useState('')
  const [linkRsn, setLinkRsn] = useState('')

  const q = linkSearch.toLowerCase()
  const filteredLinks = useMemo(() => {
    const sorted = [...links].sort((a, b) => {
      if (a.discord_id !== b.discord_id) return a.discord_id.localeCompare(b.discord_id)
      return (b.primary_rsn ? 1 : 0) - (a.primary_rsn ? 1 : 0)
    })
    if (!q) return sorted
    return sorted.filter(l =>
      (l.display_name ?? '').toLowerCase().includes(q) ||
      l.rsn.toLowerCase().includes(q) ||
      l.discord_id.includes(q)
    )
  }, [links, q])

  async function addLink() {
    if (!linkDiscordId.trim() || !linkRsn.trim()) return
    const res = await fetch('/api/admin/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: linkDiscordId.trim(), rsn: linkRsn.trim() }),
    })
    const { primary_rsn } = await res.json()
    const member = discordActivity.find(d => d.discord_id === linkDiscordId)
    const newLink: LinkRow = {
      discord_id: linkDiscordId.trim(), rsn: linkRsn.trim().toLowerCase(),
      linked_at: new Date().toISOString(), display_name: member?.display_name ?? null,
      primary_rsn: !!primary_rsn,
    }
    setLinks(l => [...l.filter(x => !(x.discord_id === newLink.discord_id && x.rsn === newLink.rsn)), newLink])
    setLinkDiscordId(''); setLinkRsn('')
  }

  async function removeLink(discord_id: string, rsn: string, wasPrimary: boolean) {
    await fetch('/api/admin/links', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn }) })
    setLinks(prev => {
      const remaining = prev.filter(x => !(x.discord_id === discord_id && x.rsn === rsn))
      // If we removed the primary, promote the next remaining RSN for this user
      if (wasPrimary) {
        const next = remaining.find(x => x.discord_id === discord_id)
        if (next) return remaining.map(x => x === next ? { ...x, primary_rsn: true } : x)
      }
      return remaining
    })
    if (editingKey === `${discord_id}:${rsn}`) setEditingKey(null)
  }

  async function setPrimary(discord_id: string, rsn: string) {
    await fetch('/api/admin/links', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn }) })
    setLinks(prev => prev.map(l => l.discord_id === discord_id ? { ...l, primary_rsn: l.rsn === rsn } : l))
  }

  async function saveEditLink(discord_id: string, oldRsn: string, wasPrimary: boolean) {
    if (!editRsn.trim() || editRsn.trim().toLowerCase() === oldRsn) { setEditingKey(null); return }
    const newRsn = editRsn.trim().toLowerCase()
    // Delete old, insert new (preserving primary status)
    await fetch('/api/admin/links', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn: oldRsn }) })
    await fetch('/api/admin/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn: newRsn }) })
    if (wasPrimary) {
      await fetch('/api/admin/links', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn: newRsn }) })
    }
    setLinks(prev => prev.map(l => l.discord_id === discord_id && l.rsn === oldRsn ? { ...l, rsn: newRsn } : l))
    setEditingKey(null)
  }

  const linkedDiscordIds = useMemo(() => new Set(links.map(l => l.discord_id)), [links])
  const linkedRsns = useMemo(() => new Set(links.map(l => l.rsn.toLowerCase())), [links])
  const unlinkedDiscord = useMemo(() => discordActivity.filter(d => !linkedDiscordIds.has(d.discord_id)), [discordActivity, linkedDiscordIds])
  const unlinkedIngame = useMemo(() => ingameActivity.filter(i => !linkedRsns.has(i.rsn.toLowerCase())), [ingameActivity, linkedRsns])

  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-1">Link Member to RSN</h2>
        <p className="text-xs text-[#4a4a70] mb-4">Members can have multiple RSNs. The first RSN linked is their primary.</p>
        <div className="flex gap-3 flex-wrap">
          <select value={linkDiscordId} onChange={e => setLinkDiscordId(e.target.value)} className={`flex-1 min-w-[180px] ${inp}`}>
            <option value="">Select Discord member…</option>
            {discordActivity.map(d => <option key={d.discord_id} value={d.discord_id}>{d.display_name ?? d.discord_id}</option>)}
          </select>
          <input value={linkRsn} onChange={e => setLinkRsn(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="RuneScape name" className={`flex-1 min-w-[160px] ${inp}`} />
          <button onClick={addLink} disabled={!linkDiscordId || !linkRsn.trim()} className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">Link</button>
        </div>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358] flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] shrink-0">
            RSN Links <span className="text-[#4a4a70] normal-case font-normal">({links.length})</span>
          </h2>
          <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Search by name or RSN…"
            className="ml-auto w-48 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-1.5 text-sm outline-none focus:border-[#7c5ce8]/60" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21213c]">
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Discord Member</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">RSN</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Linked</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#4a4a70]">{q ? 'No matches.' : 'No links yet.'}</td></tr>
              ) : filteredLinks.map((l, idx) => {
                const key = `${l.discord_id}:${l.rsn}`
                const prevId = idx > 0 ? filteredLinks[idx - 1].discord_id : null
                const isFirstForUser = l.discord_id !== prevId
                const isEditing = editingKey === key

                return (
                  <tr key={key} className={`border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50 ${!isFirstForUser ? 'bg-[#0f0f1e]/30' : ''}`}>
                    <td className="px-4 py-2.5">
                      {isFirstForUser ? (
                        <>
                          <span className="text-sm font-medium text-[#e8e8f0]">{l.display_name ?? '—'}</span>
                          <span className="text-xs text-[#4a4a70] block">{l.discord_id}</span>
                        </>
                      ) : (
                        <span className="text-xs text-[#424268] pl-3">└ alt</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input autoFocus value={editRsn} onChange={e => setEditRsn(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditLink(l.discord_id, l.rsn, l.primary_rsn); if (e.key === 'Escape') setEditingKey(null) }}
                          className="rounded bg-[#1c1c36] border border-[#7c5ce8]/60 text-[#e8e8f0] px-2 py-1 text-sm outline-none w-36" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#3d9970] font-medium">⚔️ {l.rsn}</span>
                          {l.primary_rsn && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#c89b3c]/20 text-[#c89b3c]">Primary</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#4a4a70] whitespace-nowrap">{new Date(l.linked_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEditLink(l.discord_id, l.rsn, l.primary_rsn)} disabled={!editRsn.trim()} className="text-xs text-[#57F287] hover:text-[#57F287]/80 px-2 py-1 rounded border border-[#57F287]/30 hover:border-[#57F287]/60 disabled:opacity-40">Save</button>
                            <button onClick={() => setEditingKey(null)} className="text-xs text-[#4a4a70] hover:text-[#e8e8f0] px-2 py-1 rounded border border-[#333358]">Cancel</button>
                          </>
                        ) : (
                          <>
                            {!l.primary_rsn && (
                              <button onClick={() => setPrimary(l.discord_id, l.rsn)} className="text-xs text-[#4a4a70] hover:text-[#c89b3c] px-2 py-1 rounded border border-[#333358] hover:border-[#c89b3c]/40 transition-colors">Set Primary</button>
                            )}
                            <button onClick={() => { setEditingKey(key); setEditRsn(l.rsn) }} className="text-xs text-[#4a4a70] hover:text-[#7c5ce8] px-2 py-1 rounded border border-[#333358] hover:border-[#7c5ce8]/40">Edit</button>
                            <button onClick={() => removeLink(l.discord_id, l.rsn, l.primary_rsn)} className="text-xs text-[#4a4a70] hover:text-white px-2 py-1 rounded bg-[#ED4245]/0 hover:bg-[#ED4245] border border-[#ED4245]/30 hover:border-[#ED4245]">Unlink</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Unlinked members */}
      {(unlinkedDiscord.length > 0 || unlinkedIngame.length > 0) && (
        <div className="rounded-xl border border-[#c89b3c]/30 bg-[#161628] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#333358]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
              🔗 Unlinked Members
            </h2>
            <p className="text-xs text-[#4a4a70] mt-0.5">Discord members with no RSN, or in-game names with no Discord link.</p>
          </div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1c1c36]">
            <div>
              <div className="px-4 py-2 border-b border-[#1c1c36]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Discord → No RSN ({unlinkedDiscord.length})</p>
              </div>
              {unlinkedDiscord.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[#4a4a70]">All Discord members are linked.</p>
              ) : (
                <ul className="divide-y divide-[#1c1c36]">
                  {unlinkedDiscord.map(d => (
                    <li key={d.discord_id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm text-[#e8e8f0]">{d.display_name ?? '—'}</span>
                        <span className="text-xs text-[#4a4a70] block">{d.discord_id}</span>
                      </div>
                      <button onClick={() => { setLinkDiscordId(d.discord_id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className="text-xs text-[#4a4a70] hover:text-[#7c5ce8] px-2 py-1 rounded border border-[#333358] hover:border-[#7c5ce8]/40 shrink-0">
                        Link →
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="px-4 py-2 border-b border-[#1c1c36]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">In-Game → No Discord ({unlinkedIngame.length})</p>
              </div>
              {unlinkedIngame.length === 0 ? (
                <p className="px-4 py-4 text-xs text-[#4a4a70]">All in-game names are linked.</p>
              ) : (
                <ul className="divide-y divide-[#1c1c36]">
                  {unlinkedIngame.map(i => (
                    <li key={i.rsn} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-sm text-[#3d9970]">⚔️ {i.rsn}</span>
                      <button onClick={() => { setLinkRsn(i.rsn); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className="text-xs text-[#4a4a70] hover:text-[#7c5ce8] px-2 py-1 rounded border border-[#333358] hover:border-[#7c5ce8]/40 shrink-0">
                        Link →
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
