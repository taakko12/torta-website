import Link from 'next/link'
import { getAllAchievements } from '@/lib/data'
import { ClientDate } from '@/components/ClientDate'

export const revalidate = 30

const TYPES = [
  { label: 'All', value: '' },
  { label: '⬆️ Level Up', value: 'Level Up' },
  { label: '📦 Collection Log', value: 'Collection Log' },
  { label: '✨ XP Milestone', value: 'XP Milestone' },
  { label: '⏱️ Personal Best', value: 'Personal Best' },
]

type Props = { searchParams: Promise<{ type?: string }> }

export default async function AchievementsPage({ searchParams }: Props) {
  const { type } = await searchParams
  const achievements = await getAllAchievements(type, 100)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#c89b3c] uppercase tracking-widest mb-1">
          🏆 Clan Achievements
        </h1>
        <p className="text-sm text-[#7070a0]">{achievements.length} achievement{achievements.length !== 1 ? 's' : ''} shown</p>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TYPES.map(t => (
          <Link
            key={t.value}
            href={t.value ? `/achievements?type=${encodeURIComponent(t.value)}` : '/achievements'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (type ?? '') === t.value
                ? 'bg-[#c89b3c] text-[#07070f]'
                : 'bg-[#141427] text-[#7070a0] hover:text-[#e8e8f0]'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] px-5 py-4">
        {achievements.length === 0 ? (
          <p className="text-sm text-[#7070a0]">No achievements found.</p>
        ) : (
          <ul className="divide-y divide-[#2a2a4a]">
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
    </div>
  )
}
