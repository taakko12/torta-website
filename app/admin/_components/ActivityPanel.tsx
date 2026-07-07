'use client'
import { useState } from 'react'
import type { DiscordActivity, IngameActivity, VcActivity, LinkRow } from '../_lib/data'

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
  const [combined, setCombined] = useState(false)
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

  // Enrich discord rows with RSN from links
  const linkMap = Object.fromEntries(links.map(l => [l.discord_id, l.rsn]))
  const enriched = discordRows.map(d => ({ ...d, rsn: d.rsn ?? linkMap[d.discord_id] ?? null }))

  async function saveNote(discordId: string, note: string) {
    setEditingNoteId(null)
    await fetch('/api/admin/activity', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id: discordId, note }) })
    setDiscordRows(rows => rows.map(d => d.discord_id === discordId ? { ...d, promotion_note: note || null } : d))
  }

  const ingameByRsn = new Map(ingame.map(ig => [ig.rsn.toLowerCase(), ig]))
  const matchedRsns = new Set<string>()
  const combinedData: CombinedRow[] = combined ? (() => {
    const rows: CombinedRow[] = []
    for (const d of enriched) {
      if (d.rsn) {
        const rsnKey = d.rsn.toLowerCase()
        const ig = ingameByRsn.get(rsnKey)
        matchedRsns.add(rsnKey)
        rows.push({ key: `l-${d.discord_id}`, name: d.display_name ?? d.discord_id, rsn: d.rsn, type: ig ? 'Linked' : 'Discord', role: d.role_name, month_count: d.month_count + (ig?.month_count ?? 0), message_count: d.message_count + (ig?.message_count ?? 0), last_at: d.last_message_at })
      } else {
        rows.push({ key: `d-${d.discord_id}`, name: d.display_name ?? d.discord_id, rsn: null, type: 'Discord', role: d.role_name, month_count: d.month_count, message_count: d.message_count, last_at: d.last_message_at })
      }
    }
    for (const ig of ingame) {
      if (!matchedRsns.has(ig.rsn.toLowerCase()))
        rows.push({ key: `i-${ig.rsn}`, name: ig.rsn, rsn: ig.rsn, type: 'In-Game', role: null, month_count: ig.month_count, message_count: ig.message_count, last_at: ig.last_message_at })
    }
    return rows.sort((a, b) => b.month_count - a.month_count)
  })() : []

  const combinedPages = Math.ceil(combinedData.length / PAGE)
  const discordPages = Math.ceil(enriched.length / PAGE)
  const ingamePages = Math.ceil(ingame.length / PAGE)
  const vcPages = Math.ceil(vc.length / PAGE)

  const th = 'px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]'
  const card = 'rounded-xl border border-[#333358] bg-[#161628] overflow-hidden'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setCombined(c => !c); setCombinedPage(0) }}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${combined ? 'border-[#7c5ce8] bg-[#7c5ce8]/15 text-[#b09cf8]' : 'border-[#333358] text-[#7070a0] hover:text-[#e8e8f0]'}`}>
          {combined ? 'Split View' : 'Combined View'}
        </button>
      </div>

      {combined ? (
        <div className={card}>
          <button onClick={() => setCombinedOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Chat Activity — Combined {combinedData.length > 0 && <span className="text-[#4a4a70] normal-case">({combinedData.length})</span>}</h2>
            <span className="text-[#4a4a70] text-sm">{combinedOpen ? '▲' : '▼'}</span>
          </button>
          {combinedOpen && <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#21213c]">
                <th className={`${th} text-left`}>#</th><th className={`${th} text-left`}>Name</th>
                <th className={`${th} text-left`}>Type</th><th className={`${th} text-right`}>This Month</th>
                <th className={`${th} text-right`}>All Time</th><th className={`${th} text-right`}>Last Seen</th>
              </tr></thead>
              <tbody>
                {combinedData.slice(combinedPage * PAGE, (combinedPage + 1) * PAGE).map((row, i) => (
                  <tr key={row.key} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                    <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{combinedPage * PAGE + i + 1}</td>
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
              <button onClick={() => setCombinedPage(p => Math.max(0, p - 1))} disabled={combinedPage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
              <span className="text-xs text-[#4a4a70]">Page {combinedPage + 1} of {combinedPages}</span>
              <button onClick={() => setCombinedPage(p => Math.min(combinedPages - 1, p + 1))} disabled={combinedPage === combinedPages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      ) : (<>
        {/* Discord */}
        <div className={card}>
          <button onClick={() => setDiscordOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Discord Activity {enriched.length > 0 && <span className="text-[#4a4a70] normal-case">({enriched.length})</span>}</h2>
            <span className="text-[#4a4a70] text-sm">{discordOpen ? '▲' : '▼'}</span>
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
                  {enriched.slice(discordPage * PAGE, (discordPage + 1) * PAGE).map((row, i) => (
                    <tr key={row.discord_id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                      <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{discordPage * PAGE + i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium text-[#e8e8f0]">{row.display_name ?? row.discord_id}</span>
                        {row.rsn && <span className="text-xs text-[#3d9970] ml-2">⚔️ {row.rsn}</span>}
                        <span className="text-xs text-[#4a4a70] block">{row.discord_id}</span>
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
                <button onClick={() => setDiscordPage(p => Math.max(0, p - 1))} disabled={discordPage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                <span className="text-xs text-[#4a4a70]">Page {discordPage + 1} of {discordPages}</span>
                <button onClick={() => setDiscordPage(p => Math.min(discordPages - 1, p + 1))} disabled={discordPage === discordPages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
              </div>
            )}
          </>)}
        </div>

        {/* In-Game */}
        <div className={card}>
          <button onClick={() => setIngameOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">In-Game Activity {ingame.length > 0 && <span className="text-[#4a4a70] normal-case">({ingame.length})</span>}</h2>
            <span className="text-[#4a4a70] text-sm">{ingameOpen ? '▲' : '▼'}</span>
          </button>
          {ingameOpen && (<>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#21213c]">
                  <th className={`${th} text-left`}>#</th><th className={`${th} text-left`}>RSN</th>
                  <th className={`${th} text-right`}>This Month</th><th className={`${th} text-right`}>All Time</th><th className={`${th} text-right`}>Last Seen</th>
                </tr></thead>
                <tbody>
                  {ingame.slice(ingamePage * PAGE, (ingamePage + 1) * PAGE).map((row, i) => (
                    <tr key={row.rsn} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                      <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{ingamePage * PAGE + i + 1}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{row.rsn}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold text-[#c89b3c]">{row.month_count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.message_count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-[#6868a0]">{row.last_message_at ? new Date(row.last_message_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ingamePages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#21213c]">
                <button onClick={() => setIngamePage(p => Math.max(0, p - 1))} disabled={ingamePage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
                <span className="text-xs text-[#4a4a70]">Page {ingamePage + 1} of {ingamePages}</span>
                <button onClick={() => setIngamePage(p => Math.min(ingamePages - 1, p + 1))} disabled={ingamePage === ingamePages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
              </div>
            )}
          </>)}
        </div>
      </>)}

      {/* VC Activity — always shown */}
      <div className={card}>
        <button onClick={() => setVcOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 border-b border-[#333358] hover:bg-[#1c1c36]/50 transition-colors">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Voice Channel Activity {vc.length > 0 && <span className="text-[#4a4a70] normal-case">({vc.length})</span>}</h2>
          <span className="text-[#4a4a70] text-sm">{vcOpen ? '▲' : '▼'}</span>
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
                {vc.slice(vcPage * PAGE, (vcPage + 1) * PAGE).map((row, i) => (
                  <tr key={row.discord_id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                    <td className="px-4 py-2.5 text-xs text-[#4a4a70]">#{vcPage * PAGE + i + 1}</td>
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
              <button onClick={() => setVcPage(p => Math.max(0, p - 1))} disabled={vcPage === 0} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">← Prev</button>
              <span className="text-xs text-[#4a4a70]">Page {vcPage + 1} of {vcPages}</span>
              <button onClick={() => setVcPage(p => Math.min(vcPages - 1, p + 1))} disabled={vcPage === vcPages - 1} className="text-xs text-[#7070a0] hover:text-[#e8e8f0] disabled:opacity-30">Next →</button>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
