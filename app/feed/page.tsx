import Link from 'next/link'
import {
  getMonthlyDropLeaderboard, getAlltimeDropLeaderboard,
  getMonthlyPlankLeaderboard, getAlltimePlankLeaderboard,
  getAllAchievements, getRecentDrops, getCofferLeaderboard,
  type RecentDropItem,
} from '@/lib/data'
import { DropLeaderboardTable, PlankLeaderboardTable } from '@/components/LeaderboardTable'
import { ClientDate } from '@/components/ClientDate'
import { RecentDropFeed } from '@/components/RecentDropFeed'
import { currentMonthLabel, formatGp } from '@/lib/utils'

export const revalidate = 30

export const metadata = {
  title: 'Clan Records — Torta',
  description: 'Loot leaderboards, death counts, and clan achievements for Torta OSRS clan.',
}

type Props = { searchParams: Promise<{ section?: string; tab?: string; type?: string }> }

const SECTIONS = [
  { key: 'loot', label: '💰 Loot' },
  { key: 'deaths', label: '💀 Deaths' },
  { key: 'achievements', label: '🏆 Achievements' },
  { key: 'recent', label: '📜 Recent Drops' },
  { key: 'coffer', label: '🏦 Coffer' },
] as const
type Section = typeof SECTIONS[number]['key']

const ACHIEVEMENT_TYPES = [
  { label: 'All', value: '' },
  { label: '⬆️ Level Up', value: 'Level Up' },
  { label: '✨ XP Milestone', value: 'XP Milestone' },
  { label: '⏱️ Personal Best', value: 'Personal Best' },
]

function tabCls(active: boolean, color = '#7c5ce8') {
  return active
    ? `px-4 py-2 rounded-lg text-sm font-medium bg-[${color}] text-white`
    : 'px-4 py-2 rounded-lg text-sm font-medium bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0] transition-colors'
}

export default async function FeedPage({ searchParams }: Props) {
  const sp = await searchParams
  const section: Section = sp.section === 'deaths' ? 'deaths' : sp.section === 'achievements' ? 'achievements' : sp.section === 'recent' ? 'recent' : sp.section === 'coffer' ? 'coffer' : 'loot'
  const isAlltime = sp.tab === 'alltime'
  const type = sp.type ?? ''
  const month = currentMonthLabel()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-widest text-gradient-gold mb-1">Clan Records</h1>
        <p className="text-sm text-[#9898c0]">Leaderboards &amp; achievements</p>
      </div>

      {/* Section nav */}
      <div className="flex gap-2 mb-8 border-b border-[#1c1c36] pb-4">
        {SECTIONS.map(s => (
          <Link key={s.key} href={`/feed?section=${s.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === s.key ? 'bg-[#7c5ce8] text-white' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'
            }`}>
            {s.label}
          </Link>
        ))}
      </div>

      {section === 'loot' && <LootSection isAlltime={isAlltime} month={month} />}
      {section === 'deaths' && <DeathsSection isAlltime={isAlltime} month={month} />}
      {section === 'achievements' && <AchievementsSection type={type} />}
      {section === 'recent' && <RecentSection />}
      {section === 'coffer' && <CofferSection />}
    </div>
  )
}

async function LootSection({ isAlltime, month }: { isAlltime: boolean; month: string }) {
  const entries = isAlltime ? await getAlltimeDropLeaderboard() : await getMonthlyDropLeaderboard()
  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-[#9898c0]">{isAlltime ? 'All time totals' : `${month} totals`}</p>
        <div className="flex gap-2">
          <Link href="/feed?section=loot&tab=monthly"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!isAlltime ? 'bg-[#c89b3c] text-[#0f0f1e]' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            Monthly
          </Link>
          <Link href="/feed?section=loot&tab=alltime"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAlltime ? 'bg-[#c89b3c] text-[#0f0f1e]' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            All Time
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4">
        <DropLeaderboardTable entries={entries} />
      </div>
    </>
  )
}

async function RecentSection() {
  const drops = await getRecentDrops(60)
  return (
    <>
      <p className="text-sm text-[#9898c0] mb-4">Most recent individual drops</p>
      <RecentDropFeed drops={drops} />
    </>
  )
}


async function DeathsSection({ isAlltime, month }: { isAlltime: boolean; month: string }) {
  const entries = isAlltime ? await getAlltimePlankLeaderboard() : await getMonthlyPlankLeaderboard()
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9898c0]">{isAlltime ? 'All time totals' : `${month} totals`}</p>
        <div className="flex gap-2">
          <Link href="/feed?section=deaths&tab=monthly"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!isAlltime ? 'bg-[#cc5555] text-white' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            Monthly
          </Link>
          <Link href="/feed?section=deaths&tab=alltime"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isAlltime ? 'bg-[#cc5555] text-white' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            All Time
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4">
        <PlankLeaderboardTable entries={entries} />
      </div>
    </>
  )
}

async function CofferSection() {
  const entries = await getCofferLeaderboard()
  const MEDALS = ['🥇', '🥈', '🥉']
  const total = entries.reduce((s, e) => s + e.net, 0)
  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-[#9898c0]">All-time net coffer donations per player</p>
        {total > 0 && <p className="text-xs text-[#7878a8] mt-1">Total in coffer: <span className="text-[#F39C12] font-mono">{total.toLocaleString()} gp</span></p>}
      </div>
      <div className="rounded-xl border border-[#F39C12]/20 bg-[#161628] overflow-hidden">
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#9898c0]">No coffer donations recorded yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21213c]">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">#</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Player</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Net Donated</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.player} className="border-b border-[#1c1c36] last:border-0">
                  <td className="px-4 py-2.5 text-sm text-[#7878a8] w-10">{MEDALS[i] ?? i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-[#e8e8f0]">{e.player}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-[#F39C12] font-semibold">{e.net.toLocaleString()} gp</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

async function AchievementsSection({ type }: { type: string }) {
  const achievements = await getAllAchievements(type || undefined, 100, true)
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {ACHIEVEMENT_TYPES.map(t => (
          <Link key={t.value}
            href={t.value ? `/feed?section=achievements&type=${encodeURIComponent(t.value)}` : '/feed?section=achievements'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${(type ?? '') === t.value ? 'bg-[#c89b3c] text-[#0f0f1e]' : 'bg-[#1c1c36] text-[#9898c0] hover:text-[#e8e8f0]'}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4">
        <p className="text-xs text-[#7878a8] mb-4">{achievements.length} achievement{achievements.length !== 1 ? 's' : ''}</p>
        {achievements.length === 0 ? (
          <p className="text-sm text-[#9898c0]">No achievements found.</p>
        ) : (
          <ul className="divide-y divide-[#333358]">
            {achievements.map(a => (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">{a.title}</span>
                  <span className="text-xs text-[#9898c0] shrink-0"><ClientDate iso={a.recorded_at} /></span>
                </div>
                <p className="text-sm font-medium text-[#e8e8f0] capitalize">{a.player_name}</p>
                <p className="text-xs text-[#9898c0]">{a.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
