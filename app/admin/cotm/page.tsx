'use client'
import { useState, useEffect } from 'react'

type Entry = { name: string; count: number }
type Winner = { winner_name: string; note: string | null; month: string }

export default function MotmAdminPage() {
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [month, setMonth] = useState('')
  const [winnerName, setWinnerName] = useState('')
  const [winnerNote, setWinnerNote] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/cotm').then(r => r.json()).then(d => {
      setLeaderboard(d.leaderboard ?? [])
      setWinners(d.winners ?? [])
      setMonth(d.month ?? '')
    })
  }, [])

  async function setWinner() {
    if (!winnerName.trim()) return
    const res = await fetch('/api/admin/cotm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_name: winnerName.trim(), note: winnerNote.trim() || null, month }),
    })
    if (res.ok) {
      const w = await res.json()
      setWinners(ws => [w, ...ws.filter(x => x.month !== month)])
      setStatus('✅ Winner set!')
      setWinnerName(''); setWinnerNote('')
    } else {
      const { error } = await res.json(); setStatus(`❌ ${error}`)
    }
  }

  async function removeWinner(m: string) {
    await fetch('/api/admin/cotm', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: m }) })
    setWinners(ws => ws.filter(w => w.month !== m))
  }

  const monthLabel = (m: string) => new Date(m + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60 placeholder:text-[#424268]'

  return (
    <div className="space-y-6">
      {/* Current votes */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
            {month ? `${monthLabel(month)} Votes` : 'Current Votes'}
          </h2>
        </div>
        {leaderboard.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No votes yet.</p>
        ) : (
          <ul className="divide-y divide-[#1c1c36]">
            {leaderboard.map((e, i) => (
              <li key={e.name} className="flex items-center gap-4 px-5 py-3">
                <span className="text-sm text-[#5a5a7a] w-6 text-center">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-[#e8e8f0]">{e.name}</span>
                <span className="text-sm font-bold text-[#c89b3c]">{e.count} vote{e.count !== 1 ? 's' : ''}</span>
                <button onClick={() => setWinnerName(e.name)} className="text-xs text-[#7878a8] hover:text-[#c89b3c] px-2 py-1 rounded border border-[#333358] hover:border-[#c89b3c]/50">
                  Set as winner
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Set winner */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">
          Declare Winner — {month ? monthLabel(month) : ''}
        </h2>
        <div className="flex flex-col gap-3 max-w-sm">
          <input value={winnerName} onChange={e => setWinnerName(e.target.value)} placeholder="Winner's display name" className={inp} />
          <input value={winnerNote} onChange={e => setWinnerNote(e.target.value)} placeholder="Note (optional, shown publicly)" className={inp} />
          <div className="flex items-center gap-3">
            <button onClick={setWinner} disabled={!winnerName.trim()}
              className="px-4 py-2 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-bold hover:bg-[#d4a940] transition-colors disabled:opacity-40">
              Declare Winner
            </button>
            {status && <span className="text-sm text-[#a0a0c0]">{status}</span>}
          </div>
        </div>
      </div>

      {/* Past winners */}
      {winners.length > 0 && (
        <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#333358]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Winners History</h2>
          </div>
          <ul className="divide-y divide-[#1c1c36]">
            {winners.map(w => (
              <li key={w.month} className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs text-[#5a5a7a] w-20 shrink-0">{monthLabel(w.month)}</span>
                <span className="flex-1 text-sm font-semibold text-[#c89b3c]">{w.winner_name}</span>
                {w.note && <span className="text-xs text-[#7878a8] truncate">{w.note}</span>}
                <button onClick={() => removeWinner(w.month)} className="text-xs text-[#7878a8] hover:text-[#ED4245] shrink-0">✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
