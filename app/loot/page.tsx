import Link from 'next/link'
import { getMonthlyDropLeaderboard, getAlltimeDropLeaderboard } from '@/lib/data'
import { DropLeaderboardTable } from '@/components/LeaderboardTable'
import { currentMonthLabel } from '@/lib/utils'

export const revalidate = 30

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function LootPage({ searchParams }: Props) {
  const { tab } = await searchParams
  const isAlltime = tab === 'alltime'

  const entries = isAlltime
    ? await getAlltimeDropLeaderboard()
    : await getMonthlyDropLeaderboard()

  const month = currentMonthLabel()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#c89b3c] uppercase tracking-widest mb-1">
          💰 Loot Leaders
        </h1>
        <p className="text-sm text-[#7070a0]">
          {isAlltime ? 'All time totals' : `${month} totals`}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/loot?tab=monthly"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !isAlltime
              ? 'bg-[#c89b3c] text-[#0f0f1e]'
              : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]'
          }`}
        >
          Monthly
        </Link>
        <Link
          href="/loot?tab=alltime"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isAlltime
              ? 'bg-[#c89b3c] text-[#0f0f1e]'
              : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]'
          }`}
        >
          All Time
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4">
        <DropLeaderboardTable entries={entries} />
      </div>
    </div>
  )
}
