import Link from 'next/link'
import {
  getMonthlyDropLeaderboard, getAlltimeDropLeaderboard,
  getMonthlyPlankLeaderboard, getAlltimePlankLeaderboard,
  getAllAchievements,
} from '@/lib/data'
import { DropLeaderboardTable, PlankLeaderboardTable } from '@/components/LeaderboardTable'
import { ClientDate } from '@/components/ClientDate'
import { currentMonthLabel } from '@/lib/utils'

export const revalidate = 30

type Props = { searchParams: Promise<{ section?: string; tab?: string; type?: string }> }

const SECTIONS = [
  { key: 'loot', label: '💰 Loot' },
  { key: 'deaths', label: '💀 Deaths' },
  { key: 'achievements', label: '🏆 Achievements' },
] as const

type Section = typeof SECTIONS[number]['key']

const ACHIEVEMENT_TYPES = [
  { label: 'All', value: '' },
  { label: '⬆️ Level Up', value: 'Level Up' },
  { label: '📦 Collection Log', value: 'Collection Log' },
  { label: '✨ XP Milestone', value: 'XP Milestone' },
  { label: '⏱️ Personal Best', value: 'Personal Best' },
]

function tab(cls: string) {
  return `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cls}`
}

export default async function FeedPage({ searchParams }: Props) {
  const sp = await searchParams
  const section: Section = sp.section === 'deaths' ? 'deaths' : sp.section === 'achievements' ? 'achievements' : 'loot'
  const isAlltime = sp.tab === 'alltime'
  const type = sp.type ?? ''
  const month = currentMonthLabel()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-widest text-gradient-gold mb-1">Clan Records</h1>
        <p className="text-sm text-[#7070a0]">Leaderboards &amp; achievements</p>
      </div>

      {/* Section nav */}
      <div className="flex gap-2 mb-8 border-b border-[#1c1c36] pb-4">
        {SECTIONS.map(s => (
          <Link
            key={s.key}
            href={`/feed?section=${s.key}`}
            className={tab(
              section === s.key
                ? 'bg-[#7c5ce8] text-white'
                : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]'
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* ── Loot ── */}
      {section === 'loot' && <LootSection isAlltime={isAlltime} month={month} />}

      {/* ── Deaths ── */}
      {section === 'deaths' && <DeathsSection isAlltime={isAlltime} month={month} />}

      {/* ── Achievements ── */}
      {section === 'achievements' && <AchievementsSection type={type} />}
    </div>
  )
}

async function LootSection({ isAlltime, month }: { isAlltime: boolean; month: string }) {
  const entries = isAlltime ? await getAlltimeDropLeaderboard() : await getMonthlyDropLeaderboard()
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#7070a0]">{isAlltime ? 'All time totals' : `${month} totals`}</p>
        <div className="flex gap-2">
          <Link href="/feed?section=loot&tab=monthly" className={tab(!isAlltime ? 'bg-[#c89b3c] text-[#0f0f1e]' : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]')}>Monthly</Link>
          <Link href="/feed?section=loot&tab=alltime" className={tab(isAlltime ? 'bg-[#c89b3c] text-[#0f0f1e]' : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]')}>All Time</Link>
        </div>
      </div>
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4">
        <DropLeaderboardTable entries={entries} />
      </div>
    </>
  )
}

async function DeathsSection({ isAlltime, month }: { isAlltime: boolean; month: string }) {
  const entries = isAlltime ? await getAlltimePlankLeaderboard() : await getMonthlyPlankLeaderboard()
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#7070a0]">{isAlltime ? 'All time totals' : `${month} totals`}</p>
        <div className="flex gap-2">
          <Link href="/feed?section=deaths&tab=monthly" className={tab(!isAlltime ? 'bg-[#cc5555] text-white' : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]')}>Monthly</Link>
          <Link href="/feed?section=deaths&tab=alltime" className={tab(isAlltime ? 'bg-[#cc5555] text-white' : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]')}>All Time</Link>
        </div>
      </div>
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4">
        <PlankLeaderboardTable entries={entries} />
      </div>
    </>
  )
}

async function AchievementsSection({ type }: { type: string }) {
  const achievements = await getAllAchievements(type, 100)
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {ACHIEVEMENT_TYPES.map(t => (
          <Link
            key={t.value}
            href={t.value ? `/feed?section=achievements&type=${encodeURIComponent(t.value)}` : '/feed?section=achievements'}
            className={tab((type ?? '') === t.value ? 'bg-[#c89b3c] text-[#0f0f1e]' : 'bg-[#1c1c36] text-[#7070a0] hover:text-[#e8e8f0]')}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4">
        <p className="text-xs text-[#4a4a70] mb-4">{achievements.length} achievement{achievements.length !== 1 ? 's' : ''}</p>
        {achievements.length === 0 ? (
          <p className="text-sm text-[#7070a0]">No achievements found.</p>
        ) : (
          <ul className="divide-y divide-[#333358]">
            {achievements.map(a => (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">{a.title}</span>
                  <span className="text-xs text-[#7070a0] shrink-0"><ClientDate iso={a.recorded_at} /></span>
                </div>
                <p className="text-sm font-medium text-[#e8e8f0] capitalize">{a.player_name}</p>
                <p className="text-xs text-[#7070a0]">{a.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
