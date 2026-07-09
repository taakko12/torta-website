'use client'
import { useState, useMemo } from 'react'
import type { LinkRow, DiscordActivity, IngameActivity, VcActivity, MemberNote, Absence } from '../_lib/data'

type Props = {
  initialLinks: LinkRow[]
  discordActivity: DiscordActivity[]
  ingameActivity: IngameActivity[]
  vcActivity: VcActivity[]
  initialNotes: MemberNote[]
  absences: Absence[]
}

function activityScore(discordId: string, discord: DiscordActivity[], ingame: IngameActivity[], vc: VcActivity[], links: LinkRow[]) {
  const d = discord.find(x => x.discord_id === discordId)
  const rsns = links.filter(l => l.discord_id === discordId).map(l => l.rsn.toLowerCase())
  const ig = ingame.filter(x => rsns.includes(x.rsn.toLowerCase())).reduce((s, x) => s + x.month_count, 0)
  const v = vc.find(x => x.discord_id === discordId)
  return Math.round((d?.month_count ?? 0) + ig * 2 + (v?.month_minutes ?? 0) * 0.1)
}

export default function MembersPanel({ initialLinks, discordActivity, ingameActivity, vcActivity, initialNotes, absences }: Props) {
  const [tab, setTab] = useState<'links' | 'kick'>('links')
  const [links, setLinks] = useState<LinkRow[]>(initialLinks)
  const [notes, setNotes] = useState<MemberNote[]>(initialNotes)
  const [linkSearch, setLinkSearch] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editRsn, setEditRsn] = useState('')
  const [linkDiscordId, setLinkDiscordId] = useState('')
  const [linkRsn, setLinkRsn] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})
  const [warnSent, setWarnSent] = useState<Set<string>>(new Set())

  const absentIds = useMemo(() => new Set(absences.map(a => a.discord_id)), [absences])

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

  const kickList = useMemo(() => {
    return discordActivity
      .filter(d => !absentIds.has(d.discord_id))
      .map(d => ({ ...d, score: activityScore(d.discord_id, discordActivity, ingameActivity, vcActivity, links) }))
      .filter(d => d.score < 5)
      .sort((a, b) => a.score - b.score)
  }, [discordActivity, ingameActivity, vcActivity, links, absentIds])

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
    await fetch('/api/admin/links', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn: oldRsn }) })
    await fetch('/api/admin/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn: newRsn }) })
    if (wasPrimary) await fetch('/api/admin/links', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id, rsn: newRsn }) })
    setLinks(prev => prev.map(l => l.discord_id === discord_id && l.rsn === oldRsn ? { ...l, rsn: newRsn } : l))
    setEditingKey(null)
  }

  async function addNote(discord_id: string) {
    const text = noteInput[discord_id]?.trim()
    if (!text) return
    const res = await fetch('/api/admin/member-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id, note: text }),
    })
    const { note } = await res.json()
    if (note) setNotes(prev => [note, ...prev])
    setNoteInput(prev => ({ ...prev, [discord_id]: '' }))
  }

  async function deleteNote(id: number) {
    await fetch('/api/admin/member-notes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  async function sendWarnDm(discord_id: string, display_name: string | null) {
    await fetch('/api/admin/warn-dm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discord_id, display_name }),
    })
    setWarnSent(prev => new Set([...prev, discord_id]))
  }

  const linkedDiscordIds = useMemo(() => new Set(links.map(l => l.discord_id)), [links])
  const linkedRsns = useMemo(() => new Set(links.map(l => l.rsn.toLowerCase())), [links])
  const unlinkedDiscord = useMemo(() => discordActivity.filter(d => !linkedDiscordIds.has(d.discord_id)), [discordActivity, linkedDiscordIds])
  const unlinkedIngame = useMemo(() => ingameActivity.filter(i => !linkedRsns.has(i.rsn.toLowerCase())), [ingameActivity, linkedRsns])

  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'
  const tabCls = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-[#c89b3c] text-[#c89b3c]' : 'border-transparent text-[#7878a8] hover:text-[#e8e8f0]'}`

  return (
    <div className="space-y-6">
      {/* Link form */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-1">Link Member to RSN</h2>
        <p className="text-xs text-[#7878a8] mb-4">Members can have multiple RSNs. The first RSN linked is their primary.</p>
        <div className="flex gap-3 flex-wrap">
          <select value={linkDiscordId} onChange={e => setLinkDiscordId(e.target.value)} className={`flex-1 min-w-[180px] ${inp}`}>
            <option value="">Select Discord member…</option>
            {discordActivity.map(d => <option key={d.discord_id} value={d.discord_id}>{d.display_name ?? d.discord_id}</option>)}
          </select>
          <input value={linkRsn} onChange={e => setLinkRsn(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="RuneScape name" className={`flex-1 min-w-[160px] ${inp}`} />
          <button onClick={addLink} disabled={!linkDiscordId || !linkRsn.trim()} className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">Link</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="flex border-b border-[#333358]">
          <button className={tabCls('links')} onClick={() => setTab('links')}>RSN Links</button>
          <button className={tabCls('kick')} onClick={() => setTab('kick')}>
            Kick List
            {kickList.length > 0 && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ED4245]/20 text-[#ED4245]">{kickList.length}</span>}
          </button>
        </div>

        {tab === 'links' && (
          <>
            <div className="px-5 py-3 border-b border-[#333358] flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] shrink-0">
                RSN Links <span className="text-[#7878a8] normal-case font-normal">({links.length})</span>
              </h2>
              <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Search by name or RSN…"
                className="ml-auto w-48 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-1.5 text-sm outline-none focus:border-[#7c5ce8]/60" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#21213c]">
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Discord Member</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">RSN</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Score</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Linked</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#7878a8]">{q ? 'No matches.' : 'No links yet.'}</td></tr>
                  ) : filteredLinks.map((l, idx) => {
                    const key = `${l.discord_id}:${l.rsn}`
                    const prevId = idx > 0 ? filteredLinks[idx - 1].discord_id : null
                    const isFirstForUser = l.discord_id !== prevId
                    const isEditing = editingKey === key
                    const memberNotes = notes.filter(n => n.discord_id === l.discord_id)
                    const isNotesOpen = expandedNotes.has(l.discord_id)
                    const score = isFirstForUser ? activityScore(l.discord_id, discordActivity, ingameActivity, vcActivity, links) : null
                    const isAbsent = absentIds.has(l.discord_id)

                    return [
                      <tr key={key} className={`border-b border-[#1c1c36] hover:bg-[#1c1c36]/50 ${!isFirstForUser ? 'bg-[#0f0f1e]/30' : ''}`}>
                        <td className="px-4 py-2.5">
                          {isFirstForUser ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-[#e8e8f0]">{l.display_name ?? '—'}</span>
                              {isAbsent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7c5ce8]/20 text-[#b09cf8]">ON BREAK</span>}
                              <span className="text-xs text-[#7878a8] block w-full">{l.discord_id}</span>
                            </div>
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
                              {l.primary_rsn && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#c89b3c]/20 text-[#c89b3c]">Primary</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {score !== null && (
                            <span className={`text-xs font-bold ${score >= 20 ? 'text-[#57F287]' : score >= 5 ? 'text-[#c89b3c]' : 'text-[#ED4245]'}`}>{score}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#7878a8] whitespace-nowrap">{new Date(l.linked_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEditLink(l.discord_id, l.rsn, l.primary_rsn)} disabled={!editRsn.trim()} className="text-xs text-[#57F287] hover:text-[#57F287]/80 px-2 py-1 rounded border border-[#57F287]/30 disabled:opacity-40">Save</button>
                                <button onClick={() => setEditingKey(null)} className="text-xs text-[#7878a8] hover:text-[#e8e8f0] px-2 py-1 rounded border border-[#333358]">Cancel</button>
                              </>
                            ) : (
                              <>
                                {isFirstForUser && (
                                  <button onClick={() => setExpandedNotes(prev => { const s = new Set(prev); s.has(l.discord_id) ? s.delete(l.discord_id) : s.add(l.discord_id); return s })}
                                    className="text-xs text-[#7878a8] hover:text-[#9898c0] px-2 py-1 rounded border border-[#333358] hover:border-[#7878a8]/40">
                                    📝 {memberNotes.length > 0 ? memberNotes.length : '+'}{isNotesOpen ? ' ▲' : ' ▼'}
                                  </button>
                                )}
                                {!l.primary_rsn && <button onClick={() => setPrimary(l.discord_id, l.rsn)} className="text-xs text-[#7878a8] hover:text-[#c89b3c] px-2 py-1 rounded border border-[#333358] hover:border-[#c89b3c]/40">Set Primary</button>}
                                <button onClick={() => { setEditingKey(key); setEditRsn(l.rsn) }} className="text-xs text-[#7878a8] hover:text-[#7c5ce8] px-2 py-1 rounded border border-[#333358] hover:border-[#7c5ce8]/40">Edit</button>
                                <button onClick={() => removeLink(l.discord_id, l.rsn, l.primary_rsn)} className="text-xs text-[#7878a8] hover:text-white px-2 py-1 rounded hover:bg-[#ED4245] border border-[#ED4245]/30 hover:border-[#ED4245]">Unlink</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>,
                      isFirstForUser && isNotesOpen && (
                        <tr key={`${l.discord_id}-notes`} className="border-b border-[#1c1c36] bg-[#0f0f1e]/60">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="space-y-2">
                              {memberNotes.map(n => (
                                <div key={n.id} className="flex items-start justify-between gap-3 text-xs">
                                  <div>
                                    <span className="text-[#e8e8f0]">{n.note}</span>
                                    <span className="text-[#7878a8] ml-2">— {n.created_by_name ?? 'mod'}, {new Date(n.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <button onClick={() => deleteNote(n.id)} className="text-[#7878a8] hover:text-[#ED4245] shrink-0">✕</button>
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <input value={noteInput[l.discord_id] ?? ''} onChange={e => setNoteInput(p => ({ ...p, [l.discord_id]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && addNote(l.discord_id)}
                                  placeholder="Add note…" className="flex-1 rounded bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1 text-xs outline-none focus:border-[#7c5ce8]/60" />
                                <button onClick={() => addNote(l.discord_id)} disabled={!noteInput[l.discord_id]?.trim()} className="text-xs px-3 py-1 rounded bg-[#7c5ce8]/20 text-[#b09cf8] hover:bg-[#7c5ce8]/40 disabled:opacity-40">Add</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    ]
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'kick' && (
          <div className="p-5 space-y-3">
            <p className="text-xs text-[#7878a8]">Members with an activity score below 5 this month (excludes members on break). Score = Discord msgs + in-game msgs ×2 + VC minutes ×0.1.</p>
            {kickList.length === 0 ? (
              <p className="text-sm text-[#57F287] py-4">No members below threshold. 🎉</p>
            ) : (
              <div className="rounded-xl border border-[#333358] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#21213c]">
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Member</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Score</th>
                      <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Last Seen</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kickList.map(m => (
                      <tr key={m.discord_id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-[#e8e8f0]">{m.display_name ?? '—'}</span>
                          <span className="text-xs text-[#7878a8] block">{m.discord_id}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-bold text-[#ED4245]">{m.score}</td>
                        <td className="px-4 py-2.5 text-xs text-[#7878a8]">
                          {m.last_message_at ? new Date(m.last_message_at).toLocaleDateString() : 'never'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => sendWarnDm(m.discord_id, m.display_name)}
                            disabled={warnSent.has(m.discord_id)}
                            className="text-xs px-3 py-1 rounded border border-[#c89b3c]/30 text-[#c89b3c] hover:bg-[#c89b3c]/10 disabled:opacity-40 disabled:cursor-not-allowed">
                            {warnSent.has(m.discord_id) ? '✓ Sent' : 'Send Warning DM'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unlinked members */}
      {(unlinkedDiscord.length > 0 || unlinkedIngame.length > 0) && (
        <div className="rounded-xl border border-[#c89b3c]/30 bg-[#161628] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#333358]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">🔗 Unlinked Members</h2>
            <p className="text-xs text-[#7878a8] mt-0.5">Discord members with no RSN, or in-game names with no Discord link.</p>
          </div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1c1c36]">
            <div>
              <div className="px-4 py-2 border-b border-[#1c1c36]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Discord → No RSN ({unlinkedDiscord.length})</p>
              </div>
              {unlinkedDiscord.length === 0 ? <p className="px-4 py-4 text-xs text-[#7878a8]">All linked.</p> : (
                <ul className="divide-y divide-[#1c1c36]">
                  {unlinkedDiscord.map(d => (
                    <li key={d.discord_id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm text-[#e8e8f0]">{d.display_name ?? '—'}</span>
                        <span className="text-xs text-[#7878a8] block">{d.discord_id}</span>
                      </div>
                      <button onClick={() => { setLinkDiscordId(d.discord_id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className="text-xs text-[#7878a8] hover:text-[#7c5ce8] px-2 py-1 rounded border border-[#333358] hover:border-[#7c5ce8]/40 shrink-0">Link →</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="px-4 py-2 border-b border-[#1c1c36]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">In-Game → No Discord ({unlinkedIngame.length})</p>
              </div>
              {unlinkedIngame.length === 0 ? <p className="px-4 py-4 text-xs text-[#7878a8]">All linked.</p> : (
                <ul className="divide-y divide-[#1c1c36]">
                  {unlinkedIngame.map(i => (
                    <li key={i.rsn} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-sm text-[#3d9970]">⚔️ {i.rsn}</span>
                      <button onClick={() => { setLinkRsn(i.rsn); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className="text-xs text-[#7878a8] hover:text-[#7c5ce8] px-2 py-1 rounded border border-[#333358] hover:border-[#7c5ce8]/40 shrink-0">Link →</button>
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
