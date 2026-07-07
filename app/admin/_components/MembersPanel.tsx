'use client'
import { useState } from 'react'
import type { LinkRow, DiscordActivity } from '../_lib/data'

type Props = { initialLinks: LinkRow[]; discordActivity: DiscordActivity[] }

export default function MembersPanel({ initialLinks, discordActivity }: Props) {
  const [links, setLinks] = useState<LinkRow[]>(initialLinks)
  const [linkSearch, setLinkSearch] = useState('')
  const [editingDiscordId, setEditingDiscordId] = useState<string | null>(null)
  const [editRsn, setEditRsn] = useState('')
  const [linkDiscordId, setLinkDiscordId] = useState('')
  const [linkRsn, setLinkRsn] = useState('')

  const linkedIds = new Set(links.map(l => l.discord_id))
  const unlinkedMembers = discordActivity.filter(d => !linkedIds.has(d.discord_id))
  const q = linkSearch.toLowerCase()
  const filteredLinks = q ? links.filter(l => (l.display_name ?? '').toLowerCase().includes(q) || l.rsn.toLowerCase().includes(q) || l.discord_id.includes(q)) : links

  async function addLink() {
    if (!linkDiscordId.trim() || !linkRsn.trim()) return
    await fetch('/api/admin/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id: linkDiscordId.trim(), rsn: linkRsn.trim() }),
    })
    const member = discordActivity.find(d => d.discord_id === linkDiscordId)
    const newLink: LinkRow = { discord_id: linkDiscordId.trim(), rsn: linkRsn.trim(), linked_at: new Date().toISOString(), display_name: member?.display_name ?? null }
    setLinks(l => [newLink, ...l.filter(x => x.discord_id !== linkDiscordId.trim())])
    setLinkDiscordId(''); setLinkRsn('')
  }

  async function removeLink(discordId: string) {
    await fetch('/api/admin/links', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id: discordId }) })
    setLinks(l => l.filter(x => x.discord_id !== discordId))
    if (editingDiscordId === discordId) setEditingDiscordId(null)
  }

  async function saveEditLink(discordId: string) {
    if (!editRsn.trim()) return
    await fetch('/api/admin/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id: discordId, rsn: editRsn.trim() }) })
    setLinks(l => l.map(x => x.discord_id === discordId ? { ...x, rsn: editRsn.trim() } : x))
    setEditingDiscordId(null)
  }

  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Link Member to RSN</h2>
        <div className="flex gap-3 flex-wrap">
          <select value={linkDiscordId} onChange={e => setLinkDiscordId(e.target.value)} className={`flex-1 min-w-[180px] ${inp}`}>
            <option value="">Select Discord member…</option>
            {unlinkedMembers.map(d => <option key={d.discord_id} value={d.discord_id}>{d.display_name ?? d.discord_id}</option>)}
          </select>
          <input value={linkRsn} onChange={e => setLinkRsn(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="RuneScape name" className={`flex-1 min-w-[160px] ${inp}`} />
          <button onClick={addLink} disabled={!linkDiscordId || !linkRsn.trim()} className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">Link</button>
        </div>
        <p className="text-xs text-[#4a4a70] mt-2">Only unlinked members are shown. To update an existing link, use the Edit button in the table below.</p>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358] flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] shrink-0">RSN Links <span className="text-[#4a4a70] normal-case font-normal">({links.length})</span></h2>
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
              ) : filteredLinks.map(l => (
                <tr key={l.discord_id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-[#e8e8f0]">{l.display_name ?? '—'}</span>
                    <span className="text-xs text-[#4a4a70] block">{l.discord_id}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {editingDiscordId === l.discord_id ? (
                      <input autoFocus value={editRsn} onChange={e => setEditRsn(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditLink(l.discord_id); if (e.key === 'Escape') setEditingDiscordId(null) }}
                        className="rounded bg-[#1c1c36] border border-[#7c5ce8]/60 text-[#e8e8f0] px-2 py-1 text-sm outline-none w-36" />
                    ) : (
                      <span className="text-sm text-[#3d9970] font-medium">⚔️ {l.rsn}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#4a4a70] whitespace-nowrap">{new Date(l.linked_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingDiscordId === l.discord_id ? (
                        <>
                          <button onClick={() => saveEditLink(l.discord_id)} disabled={!editRsn.trim()} className="text-xs text-[#57F287] hover:text-[#57F287]/80 px-2 py-1 rounded border border-[#57F287]/30 hover:border-[#57F287]/60 disabled:opacity-40">Save</button>
                          <button onClick={() => setEditingDiscordId(null)} className="text-xs text-[#4a4a70] hover:text-[#e8e8f0] px-2 py-1 rounded border border-[#333358]">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditingDiscordId(l.discord_id); setEditRsn(l.rsn) }} className="text-xs text-[#4a4a70] hover:text-[#7c5ce8] px-2 py-1 rounded border border-[#333358] hover:border-[#7c5ce8]/40">Edit</button>
                      )}
                      <button onClick={() => removeLink(l.discord_id)} className="text-xs text-[#4a4a70] hover:text-white px-2 py-1 rounded bg-[#ED4245]/0 hover:bg-[#ED4245] border border-[#ED4245]/30 hover:border-[#ED4245]">Unlink</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
