import Link from 'next/link'
import Image from 'next/image'
import {
  getMonthlyDropLeaderboard, getAlltimeDropLeaderboard,
  getMonthlyPlankLeaderboard, getAlltimePlankLeaderboard,
  getAllAchievements, getRecentDrops,
  type RecentDropItem,
} from '@/lib/data'
import { DropLeaderboardTable, PlankLeaderboardTable } from '@/components/LeaderboardTable'
import { ClientDate } from '@/components/ClientDate'
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
] as const
type Section = typeof SECTIONS[number]['key']

const ACHIEVEMENT_TYPES = [
  { label: 'All', value: '' },
  { label: '⬆️ Level Up', value: 'Level Up' },
  { label: '📦 Collection Log', value: 'Collection Log' },
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
  const section: Section = sp.section === 'deaths' ? 'deaths' : sp.section === 'achievements' ? 'achievements' : sp.section === 'recent' ? 'recent' : 'loot'
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

function RecentDropFeed({ drops }: { drops: RecentDropItem[] }) {
  const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
  const DROPS_CHANNEL = process.env.NEXT_PUBLIC_DROPS_CHANNEL_ID!

  if (drops.length === 0)
    return <div className="rounded-xl border border-[#333358] bg-[#161628] py-12 text-center text-sm text-[#9898c0]">No drops recorded yet.</div>

  return (
    <div className="space-y-2">
      {drops.map(d => (
        <div key={d.id} className="rounded-xl border border-[#333358] bg-[#161628] p-4 flex items-center gap-4">
          {d.image_url && (
            <Image src={d.image_url} alt={d.item_name ?? 'item'} width={36} height={36} className="rounded shrink-0 object-contain" unoptimized />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-[#e8e8f0] capitalize">{d.player_name}</span>
            {d.item_name && d.item_name !== 'Monthly aggregate' && (
              <span className="text-xs text-[#9898c0] ml-2">{d.item_name}</span>
            )}
            <div className="text-xs text-[#7878a8] mt-0.5"><ClientDate iso={d.recorded_at} /></div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono font-semibold text-[#c89b3c]">{formatGp(d.gp_value)}</div>
            {d.discord_message_id && (
              <a href={`https://discord.com/channels/${GUILD_ID}/${DROPS_CHANNEL}/${d.discord_message_id}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[#7878a8] hover:text-[#c89b3c] transition-colors">↗ Discord</a>
            )}
          </div>
        </div>
      ))}
    </div>
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

async function AchievementsSection({ type }: { type: string }) {
  const achievements = await getAllAchievements(type, 100)
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
