'use client'
import { useState, useEffect } from 'react'

type LeaderboardEntry = { player: string; net: number; deposited: number }
type DepositRow = { id: number; player: string; gp: number; action: string; recorded_at: string }
type Config = { cofferChannelId: string | null; leaderboardChannelId: string | null; leaderboardMessageId: string | null }
type Data = { leaderboard: LeaderboardEntry[]; recent: DepositRow[]; config: Config }

const MEDALS = ['🥇', '🥈', '🥉']

function fmt(n: number) {
  return n.toLocaleString() + ' gp'
}

export default function CofferPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [tab, setTab] = useState<'leaderboard' | 'activity'>('leaderboard')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function load() {
    const d = await fetch('/api/admin/coffer').then(r => r.json())
    setData(d)
  }

  useEffect(() => { load() }, [])

  async function deleteEntry(id: number) {
    setDeletingId(id)
    await fetch('/api/admin/coffer', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
    setDeletingId(null)
  }

  const card = 'rounded-xl border border-[#333358] bg-[#161628]'

  if (!data) return <p className="text-sm text-[#7878a8] py-8 text-center">Loading…</p>

  const totalNet = data.leaderboard.reduce((s, e) => s + e.net, 0)

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className={`${card} p-5`}>
          <p className="text-xs text-[#7878a8] mb-1">Net Coffer Balance</p>
          <p className="text-2xl font-bold text-[#F39C12]">{totalNet.toLocaleString()}</p>
          <p className="text-xs text-[#5a5a7a] mt-1">gp (deposits − withdrawals)</p>
        </div>
        <div className={`${card} p-5`}>
          <p className="text-xs text-[#7878a8] mb-1">Unique Donors</p>
          <p className="text-2xl font-bold text-[#57F287]">{data.leaderboard.filter(e => e.net > 0).length}</p>
          <p className="text-xs text-[#5a5a7a] mt-1">members with net deposits</p>
        </div>
        <div className={`${card} p-5`}>
          <p className="text-xs text-[#7878a8] mb-1">Leaderboard Channel</p>
          <p className="text-sm font-medium text-[#e8e8f0] mt-1">
            {data.config.leaderboardChannelId ? `#${data.config.leaderboardChannelId}` : 'Not set'}
          </p>
          <p className="text-xs text-[#5a5a7a] mt-1">set via /coffer setup</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2">
        {(['leaderboard', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-[#7c5ce8] text-white' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            {t === 'leaderboard' ? '🏆 Leaderboard' : '📋 Activity Log'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <div className={`${card} overflow-hidden`}>
          <div className="px-5 py-3 border-b border-[#333358]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
              Coffer Donors <span className="text-[#7878a8] normal-case font-normal">({data.leaderboard.length} members)</span>
            </h2>
          </div>
          {data.leaderboard.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No coffer activity recorded yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21213c]">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">#</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Player</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Net</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Total Deposited</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((e, idx) => (
                  <tr key={e.player} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                    <td className="px-4 py-2.5 text-sm text-[#7878a8]">{MEDALS[idx] ?? idx + 1}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{e.player}</td>
                    <td className={`px-4 py-2.5 text-sm font-bold font-mono ${e.net >= 0 ? 'text-[#F39C12]' : 'text-[#ED4245]'}`}>{fmt(e.net)}</td>
                    <td className="px-4 py-2.5 text-sm text-[#7878a8] font-mono">{fmt(e.deposited)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className={`${card} overflow-hidden`}>
          <div className="px-5 py-3 border-b border-[#333358]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
              Recent Activity <span className="text-[#7878a8] normal-case font-normal">(last {data.recent.length} entries)</span>
            </h2>
          </div>
          {data.recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No coffer activity recorded yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21213c]">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Player</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Action</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Amount</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map(row => (
                  <tr key={row.id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                    <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{row.player}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${row.action === 'deposited' ? 'bg-[#57F287]/15 text-[#57F287]' : 'bg-[#ED4245]/15 text-[#ED4245]'}`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-[#c89b3c]">{Number(row.gp).toLocaleString()} gp</td>
                    <td className="px-4 py-2.5 text-xs text-[#7878a8]">{new Date(row.recorded_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => deleteEntry(row.id)} disabled={deletingId === row.id}
                        className="text-[10px] text-[#5a5a7a] hover:text-[#ED4245] transition-colors disabled:opacity-40 px-1">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
