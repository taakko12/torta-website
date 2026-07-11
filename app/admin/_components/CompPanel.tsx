'use client'
import { useState, useEffect } from 'react'

type Entry = { discord_id: string; display_name: string; wins: number }
type Member = { discord_id: string; display_name: string | null }
type Data = { botw: Entry[]; sotw: Entry[]; members: Member[] }
type Pick = { id: number; metric: string; picked_at: string }

const LABELS = { botw: '💀 Boss of the Week', sotw: '📈 Skill of the Week' } as const
type CompType = keyof typeof LABELS

const HISTORY_SIZE = 5

function fmt(metric: string) {
  return metric.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function CompPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [tab, setTab] = useState<CompType>('botw')
  const [addId, setAddId] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const [picks, setPicks] = useState<Pick[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [newMetric, setNewMetric] = useState('')
  const [picksLoading, setPicksLoading] = useState(false)
  const [picksError, setPicksError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/comp').then(r => r.json()).then(setData)
  }, [])

  useEffect(() => {
    setPicksLoading(true)
    fetch(`/api/admin/comp/picks?type=${tab}`)
      .then(r => r.json())
      .then(d => { setPicks(d.picks ?? []); setExcluded(d.excluded ?? []) })
      .finally(() => setPicksLoading(false))
  }, [tab])

  async function addPick() {
    if (!newMetric.trim()) return
    setPicksError(null)
    const res = await fetch('/api/admin/comp/picks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poll_type: tab, metric: newMetric.trim() }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      setPicksError(error ?? 'Failed to add pick')
      return
    }
    const d = await fetch(`/api/admin/comp/picks?type=${tab}`).then(r => r.json())
    setPicks(d.picks ?? []); setExcluded(d.excluded ?? [])
    setNewMetric('')
  }

  async function deletePick(id: number) {
    await fetch('/api/admin/comp/picks', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPicks(p => p.filter(x => x.id !== id))
    setExcluded(picks.filter(x => x.id !== id).slice(0, HISTORY_SIZE).map(x => x.metric))
  }

  async function update(discord_id: string, action: 'add' | 'remove' | 'set', amount?: number) {
    const res = await fetch('/api/admin/comp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: tab, discord_id, action, amount }),
    })
    const { wins } = await res.json()
    setData(prev => {
      if (!prev) return prev
      const board = [...prev[tab]]
      const idx = board.findIndex(e => e.discord_id === discord_id)
      if (idx >= 0) {
        board[idx] = { ...board[idx], wins }
        if (wins === 0) board.splice(idx, 1)
      } else if (wins > 0) {
        const member = prev.members.find(m => m.discord_id === discord_id)
        board.push({ discord_id, display_name: member?.display_name ?? discord_id, wins })
      }
      board.sort((a, b) => b.wins - a.wins)
      return { ...prev, [tab]: board }
    })
  }

  async function addWin() {
    if (!addId) return
    setAdding(true); setMsg('')
    await update(addId, 'add', 1)
    setAdding(false); setAddId('')
    setMsg('Win added.')
    setTimeout(() => setMsg(''), 2000)
  }

  const card = 'rounded-xl border border-[#333358] bg-[#161628]'
  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'

  if (!data) return <p className="text-sm text-[#7878a8] py-8 text-center">Loading…</p>

  const board = data[tab]
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6">
      {/* Tab nav */}
      <div className="flex gap-2">
        {(Object.keys(LABELS) as CompType[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-[#7c5ce8] text-white' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            {LABELS[t]}
          </button>
        ))}
      </div>

      {/* Add win */}
      <div className={`${card} p-5`}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-3">Award Win</h2>
        <div className="flex gap-3 flex-wrap">
          <select value={addId} onChange={e => setAddId(e.target.value)} className={`flex-1 min-w-[200px] ${inp}`}>
            <option value="">Select member…</option>
            {data.members.map(m => (
              <option key={m.discord_id} value={m.discord_id}>{m.display_name ?? m.discord_id}</option>
            ))}
          </select>
          <button onClick={addWin} disabled={adding || !addId}
            className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] disabled:opacity-40 transition-colors">
            + Add Win
          </button>
        </div>
        {msg && <p className="text-xs text-[#57F287] mt-2">{msg}</p>}
      </div>

      {/* Leaderboard */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
            {LABELS[tab]} Wins <span className="text-[#7878a8] normal-case font-normal">({board.length} members)</span>
          </h2>
        </div>
        {board.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No wins recorded yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21213c]">
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">#</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Member</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Wins</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {board.map((e, idx) => (
                <tr key={e.discord_id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                  <td className="px-4 py-2.5 text-sm text-[#7878a8]">{medals[idx] ?? idx + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{e.display_name}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-[#c89b3c]">{e.wins}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => update(e.discord_id, 'add', 1)}
                        className="w-7 h-7 rounded bg-[#1c1c36] hover:bg-[#7c5ce8] text-[#e8e8f0] text-sm font-bold transition-colors">+</button>
                      <button onClick={() => update(e.discord_id, 'remove', 1)} disabled={e.wins <= 0}
                        className="w-7 h-7 rounded bg-[#1c1c36] hover:bg-[#ED4245] text-[#e8e8f0] text-sm font-bold transition-colors disabled:opacity-30">−</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Poll History */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-3 border-b border-[#333358] flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Poll History</h2>
            <p className="text-[10px] text-[#5a5a7a] mt-0.5">Controls which options are excluded from next week's roll</p>
          </div>
          {excluded.length > 0 && (
            <div className="text-[10px] text-[#7878a8]">
              Excluded next roll: <span className="text-[#ED4245]">{excluded.map(fmt).join(', ')}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="flex gap-2 mb-4">
            <input
              value={newMetric} onChange={e => setNewMetric(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPick()}
              placeholder={tab === 'sotw' ? 'e.g. fishing, slayer' : 'e.g. zulrah, vorkath'}
              className={`flex-1 ${inp}`}
            />
            <button onClick={addPick} disabled={!newMetric.trim()}
              className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] disabled:opacity-40 transition-colors">
              Add
            </button>
          </div>

          {picksError && <p className="text-sm text-[#ED4245] mb-3">{picksError}</p>}
          {picksLoading ? (
            <p className="text-sm text-[#7878a8] py-4 text-center">Loading…</p>
          ) : picks.length === 0 ? (
            <p className="text-sm text-[#7878a8] py-4 text-center">No picks recorded. Add past winners above to seed the exclusion list.</p>
          ) : (
            <ul className="space-y-1">
              {picks.map((p, i) => (
                <li key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${i < HISTORY_SIZE ? 'bg-[#ED4245]/8 border border-[#ED4245]/20' : 'bg-[#1c1c36]'}`}>
                  <span className={`text-[10px] w-14 shrink-0 font-medium ${i < HISTORY_SIZE ? 'text-[#ED4245]' : 'text-[#5a5a7a]'}`}>
                    {i < HISTORY_SIZE ? 'excluded' : 'older'}
                  </span>
                  <span className="flex-1 text-sm text-[#e8e8f0]">{fmt(p.metric)}</span>
                  <span className="text-[10px] text-[#5a5a7a]">{new Date(p.picked_at).toLocaleDateString()}</span>
                  <button onClick={() => deletePick(p.id)}
                    className="text-[10px] text-[#5a5a7a] hover:text-[#ED4245] transition-colors px-1">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
