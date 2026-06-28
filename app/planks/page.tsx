import Link from 'next/link'
import { getMonthlyPlankLeaderboard, getAlltimePlankLeaderboard } from '@/lib/data'
import { PlankLeaderboardTable } from '@/components/LeaderboardTable'
import { currentMonthLabel } from '@/lib/utils'

export const revalidate = 30

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function PlanksPage({ searchParams }: Props) {
  const { tab } = await searchParams
  const isAlltime = tab === 'alltime'

  const entries = isAlltime
    ? await getAlltimePlankLeaderboard()
    : await getMonthlyPlankLeaderboard()

  const month = currentMonthLabel()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#cc5555] uppercase tracking-widest mb-1">
          💀 Plank Leaders
        </h1>
        <p className="text-sm text-[#7070a0]">
          {isAlltime ? 'All time totals' : `${month} totals`}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/planks?tab=monthly"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !isAlltime
              ? 'bg-[#cc5555] text-white'
              : 'bg-[#141427] text-[#7070a0] hover:text-[#e8e8f0]'
          }`}
        >
          Monthly
        </Link>
        <Link
          href="/planks?tab=alltime"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isAlltime
              ? 'bg-[#cc5555] text-white'
              : 'bg-[#141427] text-[#7070a0] hover:text-[#e8e8f0]'
          }`}
        >
          All Time
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] px-5 py-4">
        <PlankLeaderboardTable entries={entries} />
      </div>
    </div>
  )
}
