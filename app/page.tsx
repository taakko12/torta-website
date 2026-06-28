import Link from 'next/link'
import {
  getMostRecentDrop,
  getMostRecentPlank,
  getMonthlyDropLeaderboard,
  getMonthlyPlankLeaderboard,
} from '@/lib/data'
import { formatGp, formatDate, currentMonthLabel } from '@/lib/utils'

export const revalidate = 30

const MEDALS = ['🥇', '🥈', '🥉']

export default async function Home() {
  const [recentDrop, recentPlank, topDrops, topPlanks] = await Promise.all([
    getMostRecentDrop(),
    getMostRecentPlank(),
    getMonthlyDropLeaderboard(),
    getMonthlyPlankLeaderboard(),
  ])

  const month = currentMonthLabel()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">

      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-widest uppercase text-[#c89b3c] mb-2">
          Clan Name
        </h1>
        <p className="text-[#7070a0] text-sm tracking-wide uppercase">Old School RuneScape</p>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">

        {/* Recent Drop */}
        <div className="rounded-xl border border-[#c89b3c]/25 bg-[#0e0e1c] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-3">
            💰 Most Recent Drop
          </p>
          {recentDrop ? (
            <>
              <p className="text-xl font-bold capitalize text-[#e8e8f0]">{recentDrop.player_name}</p>
              <p className="text-2xl font-mono font-semibold text-[#f0c060] mt-1">
                {formatGp(recentDrop.gp_value)}
              </p>
              {recentDrop.item_name && recentDrop.item_name !== 'Monthly aggregate' && (
                <p className="text-sm text-[#7070a0] mt-1">{recentDrop.item_name}</p>
              )}
              <p className="text-xs text-[#7070a0] mt-3">{formatDate(recentDrop.recorded_at)}</p>
            </>
          ) : (
            <p className="text-[#7070a0]">No drops recorded yet.</p>
          )}
        </div>

        {/* Recent Plank */}
        <div className="rounded-xl border border-[#cc5555]/25 bg-[#0e0e1c] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#cc5555] mb-3">
            💀 Most Recent Death
          </p>
          {recentPlank ? (
            <>
              <p className="text-xl font-bold capitalize text-[#e8e8f0]">{recentPlank.player_name}</p>
              <p className="text-sm text-[#7070a0] mt-3">{formatDate(recentPlank.recorded_at)}</p>
            </>
          ) : (
            <p className="text-[#7070a0]">No deaths recorded yet.</p>
          )}
        </div>
      </div>

      {/* Mini Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Loot Preview */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#e8e8f0]">💰 Loot Leaders</h2>
            <span className="text-xs text-[#7070a0]">{month}</span>
          </div>
          {topDrops.length === 0 ? (
            <p className="text-sm text-[#7070a0]">No loot recorded this month.</p>
          ) : (
            <ul className="space-y-2">
              {topDrops.slice(0, 5).map((e, i) => (
                <li key={e.name} className="flex items-center justify-between gap-2">
                  <span className="text-base w-6 shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                  <span className="flex-1 capitalize text-sm font-medium text-[#e8e8f0] truncate">{e.name}</span>
                  <span className="font-mono text-sm text-[#c89b3c]">{formatGp(e.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/loot"
            className="mt-4 block text-center text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors"
          >
            View full leaderboard →
          </Link>
        </div>

        {/* Plank Preview */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#e8e8f0]">💀 Plank Leaders</h2>
            <span className="text-xs text-[#7070a0]">{month}</span>
          </div>
          {topPlanks.length === 0 ? (
            <p className="text-sm text-[#7070a0]">No deaths recorded this month.</p>
          ) : (
            <ul className="space-y-2">
              {topPlanks.slice(0, 5).map((e, i) => (
                <li key={e.name} className="flex items-center justify-between gap-2">
                  <span className="text-base w-6 shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                  <span className="flex-1 capitalize text-sm font-medium text-[#e8e8f0] truncate">{e.name}</span>
                  <span className="font-mono text-sm text-[#cc5555]">{e.count} 💀</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/planks"
            className="mt-4 block text-center text-xs text-[#7070a0] hover:text-[#cc5555] transition-colors"
          >
            View full leaderboard →
          </Link>
        </div>
      </div>
    </div>
  )
}
