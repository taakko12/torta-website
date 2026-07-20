'use client'
import { useState, useMemo } from 'react'
import type { DiscordActivity, IngameActivity, VcActivity, LinkRow } from '../_lib/data'
import { CARD } from './ui'

type Props = {
  discord: DiscordActivity[]
  ingame: IngameActivity[]
  vc: VcActivity[]
  links: LinkRow[]
}

const PAGE = 25

function formatMinutes(mins: number) {
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

type CombinedRow = { key: string; name: string; rsn: string | null; type: 'Discord' | 'In-Game' | 'Linked'; role: string | null; month_count: number; message_count: number; last_at: string | null }

export default function ActivityPanel({ discord, ingame, vc, links }: Props) {
  const [combined, setCombined] = useState(true)
  const [combinedPage, setCombinedPage] = useState(0)
  const [discordPage, setDiscordPage] = useState(0)
  const [ingamePage, setIngamePage] = useState(0)
  const [vcPage, setVcPage] = useState(0)
  const [discordOpen, setDiscordOpen] = useState(false)
  const [ingameOpen, setIngameOpen] = useState(false)
  const [vcOpen, setVcOpen] = useState(true)
  const [combinedOpen, setCombinedOpen] = useState(true)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const [discordRows, setDiscordRows] = useState(discord)
  const [localLinks, setLocalLinks] = useState<LinkRow[]>(links)
  const [ingameRows, setIngameRows] = useState<IngameActivity[]>(ingame)
  const [quickLinkRsn, setQuickLinkRsn] = useState<string | null>(null)
  const [quickLinkDiscordId, setQuickLinkDiscordId] = useState('')
  const [quickLinkSearch, setQuickLinkSearch] = useState('')
  const [mergeFromRsn, setMergeFromRsn] = useState<string | null>(null)
  const [mergeToRsn, setMergeToRsn] = useState('')
  const [merging, setMerging] = useState(false)
  const [rankFilter, setRankFilter] = useState('')

  const allRanks = useMemo(() => {
    const s = new Set<string>()
    for (const d of discordRows) if (d.role_name) s.add(d.role_name)
    for (const v of vc) if (v.role_name) s.add(v.role_name)
    return [...s].sort()
  }, [discordRows, vc])

  // Primary RSN per discord_id (for display enrichment)
  const primaryLinkMap = Object.fromEntries(localLinks.filter(l => l.primary_rsn).map(l => [l.discord_id, l.rsn]))
  // All RSNs per discord_id (for combined view aggregation)
  const discordRsns = localLinks.reduce<Record<string, string[]>>((acc, l) => {
    ;(acc[l.discord_id] ??= []).push(l.rsn.toLowerCase())
    return acc
  }, {})
  const linkedRsns = new Map(localLinks.map(l => [l.rsn.toLowerCase(), l]))
  const enriched = discordRows.map(d => ({ ...d, rsn: d.rsn ?? primaryLinkMap[d.discord_id] ?? null }))
  const linkedIds = new Set(localLinks.map(l => l.discord_id))
  const unlinkedDiscord = discordRows.filter(d => !linkedIds.has(d.discord_id))

  async function saveNote(discordId: string, note: string) {
    setEditingNoteId(null)
    await fetch('/api/admin/activity', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id: discordId, note }) })
    setDiscordRows(rows => rows.map(d => d.discord_id === discordId ? { ...d, promotion_note: note || null } : d))
  }

  async function doQuickLink(rsn: string) {
    if (!quickLinkDiscordId) return
    const member = discordRows.find(d => d.discord_id === quickLinkDiscordId)
    const res = await fetch('/api/admin/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id: quickLinkDiscordId, rsn }) })
    const { primary_rsn } = await res.json()
    setLocalLinks(l => [...l.filter(x => !(x.discord_id === quickLinkDiscordId && x.rsn === rsn)), { discord_id: quickLinkDiscordId, rsn, linked_at: new Date().toISOString(), display_name: member?.display_name ?? null, primary_rsn: !!primary_rsn }])
    setQuickLinkRsn(null)
  }

  async function doMerge() {
    if (!mergeFromRsn || !mergeToRsn.trim()) return
    setMerging(true)
    const res = await fetch('/api/admin/merge-rsn', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_rsn: mergeFromRsn, to_rsn: mergeToRsn.trim() }),
    })
    if (res.ok) {
      setIngameRows(rows => {
        const from = rows.find(r => r.rsn.toLowerCase() === mergeFromRsn.toLowerCase())
        const toIdx = rows.findIndex(r => r.rsn.toLowerCase() === mergeToRsn.trim().toLowerCase())
        if (!from) return rows.filter(r => r.rsn.toLowerCase() !== mergeFromRsn.toLowerCase())
        if (toIdx !== -1) {
          const updated = rows.map((r, i) => i === toIdx
            ? { ...r, message_count: r.message_count + from.message_count, month_count: r.month_count + from.month_count }
            : r)
          return updated.filter(r => r.rsn.toLowerCase() !== mergeFromRsn.toLowerCase())
        }
        // to_rsn was new — just rename
        return rows.map(r => r.rsn.toLowerCase() === mergeFromRsn.toLowerCase() ? { ...r, rsn: mergeToRsn.trim() } : r)
      })
      setMergeFromRsn(null); setMergeToRsn('')
    } else {
      const { error } = await res.json()
      alert(error ?? 'Merge failed')
    }
    setMerging(false)
  }

  const ingameByRsn = new Map(ingame.map(ig => [ig.rsn.toLowerCase(), ig]))
  const matchedRsns = new Set<string>()
  const combinedData: CombinedRow[] = combined ? (() => {
    const rows: CombinedRow[] = []
    for (const d of enriched) {
      const rsns = discordRsns[d.discord_id] ?? (d.rsn ? [d.rsn.toLowerCase()] : [])
      let igMonth = 0, igAll = 0, hasIngame = false
      for (const rsnKey of rsns) {
        const ig = ingameByRsn.get(rsnKey)
        if (ig) { igMonth += ig.month_count; igAll += ig.message_count; hasIngame = true }
        matchedRsns.add(rsnKey)
      }
      const displayRsn = d.rsn  // primary RSN from enrichment
      rows.push({ key: `l-${d.discord_id}`, name: d.display_name ?? d.discord_id, rsn: displayRsn, type: (hasIngame || displayRsn) ? (hasIngame ? 'Linked' : 'Discord') : 'Discord', role: d.role_name, month_count: d.month_count + igMonth, message_count: d.message_count + igAll, last_at: d.last_message_at })
    }
    for (const ig of ingameRows) {
      if (!matchedRsns.has(ig.rsn.toLowerCase()))
        rows.push({ key: `i-${ig.rsn}`, name: ig.rsn, rsn: ig.rsn, type: 'In-Game', role: null, month_count: ig.month_count, message_count: ig.message_count, last_at: ig.last_message_at })
    }
    return rows.sort((a, b) => b.month_count - a.month_count)
  })() : []

  const filteredCombined = rankFilter ? combinedData.filter(r => r.role === rankFilter) : combinedData
  const filteredEnriched = rankFilter ? enriched.filter(d => d.role_name === rankFilter) : enriched
  const filteredVc = rankFilter ? vc.filter(v => v.role_name === rankFilter) : vc

  const combinedPages = Math.ceil(filteredCombined.length / PAGE)
  const discordPages = Math.ceil(filteredEnriched.length / PAGE)
  const ingamePages = Math.ceil(ingameRows.length / PAGE)
  const vcPages = Math.ceil(filteredVc.length / PAGE)

  function downloadCsv() {
    const rows = combined ? filteredCombined : filteredEnriched.map(d => ({
      key: d.discord_id, name: d.display_name ?? d.discord_id, rsn: d.rsn ?? primaryLinkMap[d.discord_id] ?? null,
      type: 'Discord' as const, role: d.role_name, month_count: d.month_count, message_count: d.message_count, last_at: d.last_message_at,
    }))
    const header = 'Name,RSN,Type,Role,This Month,All Time,Last Seen'
    const lines = rows.map(r => [
      `"${(r.name ?? '').replace(/"/g, '""')}"`,
      `"${(r.rsn ?? '').replace(/"/g, '""')}"`,
      r.type,
      `"${(r.role ?? '').replace(/"/g, '""')}"`,
      r.month_count,
      r.message_count,
      r.last_at ? new Date(r.last_at).toLocaleDateString() : '',
    ].join(','))
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const th = 'px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#7878a8]'
  const card = CARD

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {allRanks.length > 0 && (
          <select
            value={rankFilter}
            onChange={e => { setRankFilter(e.target.value); setCombinedPage(0); setDiscordPage(0); setVcPage(0) }}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#333358] bg-[#161628] text-[#9898c0] hover:text-[#e8e8f0] outline-none cursor-pointer"
          >
            <option value="">All Ranks</option>
            {allRanks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <button onClick={downloadCsv}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#333358] text-[#9898c0] hover:text-[#e8e8f0] hover:border-[#57F287]/50 transition-colors">
          ↓ CSV
        </button>
        <button onClick={() => { setCombined(c => !c); setCombinedPage(0) }}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${combined ? 'border-[#7c5ce8] bg-[#7c5ce8]/15 text-[#b09cf8]' : 'border-[#333358] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
          {combined ? 'Split View' : 'Combined View'}
        </button>
      </div>

      {combined ? (
        <div className={card}>
          <button onClick={() => setCombinedOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Chat Activity — Combined {filteredCombined.length > 0 && <span className="text-[#7878a8] normal-case">({filteredCombined.length})</span>}</h2>
            <span className="text-[#7878a8] text-sm">{combinedOpen ? '▲' : '▼'}</span>
          </button>
          {combinedOpen && <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#21213c]">
                <th className={`${th} text-left`}>#</th><th className={`${th} text-left`}>Name</th>
                <th className={`${th} text-left`}>Type</th><th className={`${th} text-right`}>This Month</th>
                <th className={`${th} text-right`}>All Time</th><th className={`${th} text-right`}>Last Seen</th>
              </tr></thead>
              <tbody>
                {filteredCombined.slice(combinedPage * PAGE, (combinedPage + 1) * PAGE).map((row, i) => (
                  <tr key={row.key} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                    <td className="px-4 py-2.5 text-xs text-[#7878a8]">#{combinedPage * PAGE + i + 1}</td>
                    <td className="px-4 py-2.5"><span className="text-sm font-medium text-[#e8e8f0]">{row.name}</span>{row.rsn && row.type !== 'In-Game' && <span className="text-xs text-[#3d9970] ml-2">⚔️ {row.rsn}</span>}{row.role && <span className="text-xs text-[#7c5ce8] ml-2">{row.role}</span>}</td>
                    <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.type === 'Discord' ? 'bg-[#5865F2]/20 text-[#8ea0f8]' : row.type === 'Linked' ? 'bg-[#c89b3c]/20 text-[#c89b3c]' : 'bg-[#3d9970]/20 text-[#5cbf87]'}`}>{row.type}</span></td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-[#c89b3c]">{row.month_count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.message_count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.last_at ? new Date(row.last_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          {combinedOpen && combinedPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#21213c]">
              <button onClick={() => setCombinedPage(p => Math.max(0, p - 1))} disabled={combinedPage === 0} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
              <span className="text-xs text-[#7878a8]">Page {combinedPage + 1} of {combinedPages}</span>
              <button onClick={() => setCombinedPage(p => Math.min(combinedPages - 1, p + 1))} disabled={combinedPage === combinedPages - 1} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      ) : (<>
        {/* Discord */}
        <div className={card}>
          <button onClick={() => setDiscordOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Discord Activity {filteredEnriched.length > 0 && <span className="text-[#7878a8] normal-case">({filteredEnriched.length})</span>}</h2>
            <span className="text-[#7878a8] text-sm">{discordOpen ? '▲' : '▼'}</span>
          </button>
          {discordOpen && (<>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#21213c]">
                  <th className={`${th} text-left`}>#</th><th className={`${th} text-left`}>Member</th>
                  <th className={`${th} text-left`}>Role</th><th className={`${th} text-left`}>Note</th>
                  <th className={`${th} text-right`}>This Month</th><th className={`${th} text-right`}>All Time</th><th className={`${th} text-right`}>Last Seen</th>
                </tr></thead>
                <tbody>
                  {filteredEnriched.slice(discordPage * PAGE, (discordPage + 1) * PAGE).map((row, i) => (
                    <tr key={row.discord_id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                      <td className="px-4 py-2.5 text-xs text-[#7878a8]">#{discordPage * PAGE + i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium text-[#e8e8f0]">{row.display_name ?? row.discord_id}</span>
                        {row.rsn && <span className="text-xs text-[#3d9970] ml-2">⚔️ {row.rsn}</span>}
                        <span className="text-xs text-[#7878a8] block">{row.discord_id}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#7c5ce8]">{row.role_name ?? '—'}</td>
                      <td className="px-4 py-2.5 max-w-[160px]">
                        {editingNoteId === row.discord_id ? (
                          <input autoFocus defaultValue={noteValue} onBlur={e => saveNote(row.discord_id, e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote(row.discord_id, (e.target as HTMLInputElement).value)} className="w-full bg-[#21213c] border border-[#7c5ce8]/50 rounded px-2 py-1 text-xs text-[#e8e8f0] outline-none" />
                        ) : (
                          <button onClick={() => { setEditingNoteId(row.discord_id); setNoteValue(row.promotion_note ?? '') }} className="text-xs text-left w-full truncate text-[#6868a0] hover:text-[#e8e8f0] transition-colors">
                            {row.promotion_note ?? <span className="text-[#424268]">add note…</span>}
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
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#21213c]">
                <button onClick={() => setDiscordPage(p => Math.max(0, p - 1))} disabled={discordPage === 0} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                <span className="text-xs text-[#7878a8]">Page {discordPage + 1} of {discordPages}</span>
                <button onClick={() => setDiscordPage(p => Math.min(discordPages - 1, p + 1))} disabled={discordPage === discordPages - 1} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
              </div>
            )}
          </>)}
        </div>

        {/* In-Game */}
        <div className={card}>
          <button onClick={() => setIngameOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">In-Game Activity {ingameRows.length > 0 && <span className="text-[#7878a8] normal-case">({ingameRows.length})</span>}</h2>
            <span className="text-[#7878a8] text-sm">{ingameOpen ? '▲' : '▼'}</span>
          </button>
          {ingameOpen && (<>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#21213c]">
                  <th className={`${th} text-left`}>#</th><th className={`${th} text-left`}>RSN</th>
                  <th className={`${th} text-left`}>Discord</th>
                  <th className={`${th} text-right`}>This Month</th><th className={`${th} text-right`}>All Time</th><th className={`${th} text-right`}>Last Seen</th>
                </tr></thead>
                <tbody>
                  {ingameRows.slice(ingamePage * PAGE, (ingamePage + 1) * PAGE).map((row, i) => {
                    const linked = linkedRsns.get(row.rsn.toLowerCase())
                    const isLinking = quickLinkRsn === row.rsn
                    const isMerging = mergeFromRsn === row.rsn
                    return (
                    <tr key={row.rsn} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                      <td className="px-4 py-2.5 text-xs text-[#7878a8]">#{ingamePage * PAGE + i + 1}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{row.rsn}</td>
                      <td className="px-4 py-2.5 min-w-[240px]">
                        {isMerging ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <input
                              autoFocus
                              list="ingame-rsn-list"
                              value={mergeToRsn}
                              onChange={e => setMergeToRsn(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && doMerge()}
                              placeholder="Merge into RSN…"
                              className="rounded bg-[#1c1c36] border border-[#ED4245]/60 text-[#e8e8f0] px-2 py-1 text-xs outline-none w-36"
                            />
                            <datalist id="ingame-rsn-list">
                              {ingameRows.filter(r => r.rsn !== row.rsn).map(r => <option key={r.rsn} value={r.rsn} />)}
                            </datalist>
                            <button onClick={doMerge} disabled={!mergeToRsn.trim() || merging}
                              className="text-xs px-2 py-1 rounded bg-[#ED4245]/20 text-[#ED4245] border border-[#ED4245]/30 hover:bg-[#ED4245]/30 disabled:opacity-40">
                              {merging ? '…' : 'Merge'}
                            </button>
                            <button onClick={() => { setMergeFromRsn(null); setMergeToRsn('') }}
                              className="text-xs px-2 py-1 rounded text-[#7878a8] hover:text-[#e8e8f0] border border-[#333358]">✕</button>
                          </div>
                        ) : linked ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#5865F2]">⚯ {linked.display_name ?? linked.discord_id}</span>
                          </div>
                        ) : isLinking ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              list="quick-link-members"
                              value={quickLinkSearch}
                              onChange={e => {
                                const val = e.target.value
                                setQuickLinkSearch(val)
                                const match = unlinkedDiscord.find(d => (d.display_name ?? d.discord_id).toLowerCase() === val.toLowerCase())
                                setQuickLinkDiscordId(match?.discord_id ?? '')
                              }}
                              placeholder="Search member…"
                              className="rounded bg-[#1c1c36] border border-[#7c5ce8]/60 text-[#e8e8f0] px-2 py-1 text-xs outline-none w-40"
                            />
                            <datalist id="quick-link-members">
                              {unlinkedDiscord.map(d => <option key={d.discord_id} value={d.display_name ?? d.discord_id} />)}
                            </datalist>
                            <button onClick={() => doQuickLink(row.rsn)} disabled={!quickLinkDiscordId}
                              className="text-xs px-2 py-1 rounded bg-[#57F287]/20 text-[#57F287] border border-[#57F287]/30 hover:bg-[#57F287]/30 disabled:opacity-40">Link</button>
                            <button onClick={() => { setQuickLinkRsn(null); setQuickLinkSearch('') }}
                              className="text-xs px-2 py-1 rounded text-[#7878a8] hover:text-[#e8e8f0] border border-[#333358]">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => { setQuickLinkRsn(row.rsn); setQuickLinkDiscordId(''); setQuickLinkSearch(''); setMergeFromRsn(null) }}
                              className="text-xs px-2 py-1 rounded text-[#7878a8] hover:text-[#c89b3c] border border-[#333358] hover:border-[#c89b3c]/40 transition-colors">
                              + Link
                            </button>
                            <button onClick={() => { setMergeFromRsn(row.rsn); setMergeToRsn(''); setQuickLinkRsn(null) }}
                              className="text-xs px-2 py-1 rounded text-[#7878a8] hover:text-[#ED4245] border border-[#333358] hover:border-[#ED4245]/40 transition-colors">
                              Merge →
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold text-[#c89b3c]">{row.month_count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.message_count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.last_message_at ? new Date(row.last_message_at).toLocaleDateString() : '—'}</td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {ingamePages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#21213c]">
                <button onClick={() => setIngamePage(p => Math.max(0, p - 1))} disabled={ingamePage === 0} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                <span className="text-xs text-[#7878a8]">Page {ingamePage + 1} of {ingamePages}</span>
                <button onClick={() => setIngamePage(p => Math.min(ingamePages - 1, p + 1))} disabled={ingamePage === ingamePages - 1} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
              </div>
            )}
          </>)}
        </div>
      </>)}

      {/* VC Activity — always shown */}
      <div className={card}>
        <button onClick={() => setVcOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Voice Channel Activity {filteredVc.length > 0 && <span className="text-[#7878a8] normal-case">({filteredVc.length})</span>}</h2>
          <span className="text-[#7878a8] text-sm">{vcOpen ? '▲' : '▼'}</span>
        </button>
        {vcOpen && (<>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#21213c]">
                <th className={`${th} text-left`}>#</th><th className={`${th} text-left`}>Member</th>
                <th className={`${th} text-left`}>Role</th><th className={`${th} text-right`}>This Month</th>
                <th className={`${th} text-right`}>All Time</th><th className={`${th} text-right`}>Last Seen</th>
              </tr></thead>
              <tbody>
                {filteredVc.slice(vcPage * PAGE, (vcPage + 1) * PAGE).map((row, i) => (
                  <tr key={row.discord_id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                    <td className="px-4 py-2.5 text-xs text-[#7878a8]">#{vcPage * PAGE + i + 1}</td>
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
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#21213c]">
              <button onClick={() => setVcPage(p => Math.max(0, p - 1))} disabled={vcPage === 0} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
              <span className="text-xs text-[#7878a8]">Page {vcPage + 1} of {vcPages}</span>
              <button onClick={() => setVcPage(p => Math.min(vcPages - 1, p + 1))} disabled={vcPage === vcPages - 1} className="text-xs text-[#9898c0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
