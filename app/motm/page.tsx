'use client'
import { useState, useEffect } from 'react'

type Entry = { name: string; count: number }
type Winner = { winner_name: string; note: string | null; month: string }

export default function MotmPage() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [month, setMonth] = useState('')
  const [nominee, setNominee] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/motm').then(r => r.json()).then(d => {
      setLeaderboard(d.leaderboard ?? [])
      setWinners(d.winners ?? [])
      setMonth(d.month ?? '')
      setLoading(false)
    })
  }, [])

  async function nominate() {
    if (!nominee.trim()) return
    setStatus(null)
    const res = await fetch('/api/motm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nominee_name: nominee.trim() }),
    })
    if (res.ok) {
      setStatus('✅ Vote cast! You can change your vote once per month.')
      setLeaderboard(lb => {
        const existing = lb.find(e => e.name.toLowerCase() === nominee.trim().toLowerCase())
        if (existing) return lb.map(e => e.name.toLowerCase() === nominee.trim().toLowerCase() ? { ...e, count: e.count + 1 } : e).sort((a, b) => b.count - a.count)
        return [...lb, { name: nominee.trim(), count: 1 }].sort((a, b) => b.count - a.count)
      })
      setNominee('')
    } else {
      const { error } = await res.json(); setStatus(`❌ ${error}`)
    }
  }

  const monthLabel = month ? new Date(month + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' }) : ''
  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60 placeholder:text-[#424268]'

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Community</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Clannie of the Month</h1>
        {monthLabel && <p className="text-sm text-[#9898c0] mt-1">{monthLabel}</p>}
      </div>

      {/* Recent winners */}
      {winners.length > 0 && (
        <div className="rounded-xl border border-[#c89b3c]/25 bg-[#161628] p-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c89b3c] mb-3">Past Winners</p>
          <div className="space-y-2">
            {winners.map(w => (
              <div key={w.month} className="flex items-center gap-3">
                <span className="text-xs text-[#5a5a7a] w-16 shrink-0">{new Date(w.month + '-02').toLocaleString('en-US', { month: 'short', year: 'numeric' })}</span>
                <span className="text-sm font-semibold text-[#c89b3c]">{w.winner_name}</span>
                {w.note && <span className="text-xs text-[#7878a8] truncate">{w.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vote form */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7878a8] mb-3">Cast Your Vote</p>
        <p className="text-xs text-[#5a5a7a] mb-4">Anonymous. One vote per IP per month — you can change it any time.</p>
        <div className="flex gap-2">
          <input
            value={nominee} onChange={e => setNominee(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nominate()}
            placeholder="Discord display name…" className={`flex-1 ${inp}`}
          />
          <button onClick={nominate} disabled={!nominee.trim()}
            className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-bold hover:bg-[#d4a940] transition-colors disabled:opacity-40">
            Vote
          </button>
        </div>
        {status && <p className="text-sm text-[#a0a0c0] mt-3">{status}</p>}
      </div>

      {/* Current standings */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7878a8]">Current Standings</p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">Loading…</p>
        ) : leaderboard.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No votes yet this month. Be the first!</p>
        ) : (
          <ul className="divide-y divide-[#1c1c36]">
            {leaderboard.map((e, i) => (
              <li key={e.name} className="flex items-center gap-4 px-5 py-3">
                <span className="text-lg font-black text-[#5a5a7a] w-6 text-center">{i === 0 ? '👑' : i + 1}</span>
                <span className="flex-1 text-sm font-medium text-[#e8e8f0]">{e.name}</span>
                <span className="text-sm font-bold text-[#c89b3c]">{e.count} {e.count === 1 ? 'vote' : 'votes'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
