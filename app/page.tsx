import Link from 'next/link'
import Image from 'next/image'
import {
  getMostRecentDrop,
  getMostRecentPlank,
  getMonthlyDropLeaderboard,
  getMonthlyPlankLeaderboard,
  getRecentAchievements,
  type RecentDrop,
  type RecentPlank,
} from '@/lib/data'
import {
  getActiveCompetitionsWithStandings,
  getUpcomingCompetitions,
  formatMetric,
  formatGained,
} from '@/lib/wom'
import { formatGp, currentMonthLabel, MEDALS } from '@/lib/utils'
import { ClientDate } from '@/components/ClientDate'

export const revalidate = 30
const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DROPS_CHANNEL = process.env.NEXT_PUBLIC_DROPS_CHANNEL_ID!
const PLANKS_CHANNEL = process.env.NEXT_PUBLIC_PLANKS_CHANNEL_ID!

function discordLink(channelId: string, messageId: string | null) {
  if (!messageId) return null
  return `https://discord.com/channels/${GUILD_ID}/${channelId}/${messageId}`
}

function timeUntilLabel(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  const hours = Math.ceil(ms / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h`
  return `${Math.ceil(hours / 24)}d`
}

function RecentDropCard({ drop }: { drop: RecentDrop | null }) {
  return (
    <div className="rounded-xl border border-[#c89b3c]/25 bg-[#161628] p-5 flex flex-col h-full">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-3">💰 Most Recent Drop</p>
      {drop ? (
        <>
          <div className="flex items-start gap-3">
            {drop.image_url && (
              <Image src={drop.image_url} alt={drop.item_name ?? 'drop'} width={40} height={40}
                className="rounded mt-1 shrink-0 object-contain" unoptimized />
            )}
            <div>
              <p className="text-xl font-bold capitalize text-[#e8e8f0]">{drop.player_name}</p>
              <p className="text-2xl font-mono font-semibold text-[#f0c060] mt-1">{formatGp(drop.gp_value)}</p>
              {drop.item_name && drop.item_name !== 'Monthly aggregate' && (
                <p className="text-sm text-[#7070a0] mt-1">{drop.item_name}</p>
              )}
              <p className="text-xs text-[#7070a0] mt-2"><ClientDate iso={drop.recorded_at} /></p>
              {discordLink(DROPS_CHANNEL, drop.discord_message_id) && (
                <a href={discordLink(DROPS_CHANNEL, drop.discord_message_id)!} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors">
                  View in Discord →
                </a>
              )}
            </div>
          </div>
          {drop.screenshot_url && (
            <div className="mt-auto pt-4">
              <Image src={drop.screenshot_url} alt="drop screenshot" width={800} height={500}
                className="w-full rounded-lg object-cover" unoptimized />
            </div>
          )}
        </>
      ) : (
        <p className="text-[#7070a0]">No drops recorded yet.</p>
      )}
    </div>
  )
}

function RecentPlankCard({ plank }: { plank: RecentPlank | null }) {
  return (
    <div className="rounded-xl border border-[#cc5555]/25 bg-[#161628] p-5 flex flex-col h-full">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#cc5555] mb-3">💀 Most Recent Death</p>
      {plank ? (
        <>
          <p className="text-xl font-bold capitalize text-[#e8e8f0]">{plank.player_name}</p>
          <p className="text-xs text-[#7070a0] mt-1"><ClientDate iso={plank.recorded_at} /></p>
          {discordLink(PLANKS_CHANNEL, plank.discord_message_id) && (
            <a href={discordLink(PLANKS_CHANNEL, plank.discord_message_id)!} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-[#7070a0] hover:text-[#cc5555] transition-colors">
              View in Discord →
            </a>
          )}
          {plank.image_url && (
            <div className="mt-auto pt-4">
              <Image src={plank.image_url} alt="death screenshot" width={800} height={500}
                className="w-full rounded-lg object-cover" unoptimized />
            </div>
          )}
        </>
      ) : (
        <p className="text-[#7070a0]">No deaths recorded yet.</p>
      )}
    </div>
  )
}

export default async function Home() {
  const [recentDrop, recentPlank, topDrops, topPlanks, activeComps, upcomingComps, achievements] = await Promise.all([
    getMostRecentDrop(),
    getMostRecentPlank(),
    getMonthlyDropLeaderboard(),
    getMonthlyPlankLeaderboard(),
    getActiveCompetitionsWithStandings(),
    getUpcomingCompetitions(),
    getRecentAchievements(5),
  ])

  const month = currentMonthLabel()
  const hasEvents = activeComps.length > 0 || upcomingComps.length > 0

  return (
    <div className="mx-auto max-w-screen-2xl px-4 xl:px-12 py-10">

      {/* ── Hero ── */}
      <div className="mb-14 xl:mb-20 text-center relative py-8 xl:py-16">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#7c5ce8]/8 to-transparent blur-3xl pointer-events-none" />
        {/* Corner brackets — desktop only */}
        <div className="hidden xl:block absolute top-6 left-0 w-10 h-10 border-t-2 border-l-2 border-[#c89b3c]/25 rounded-tl" />
        <div className="hidden xl:block absolute top-6 right-0 w-10 h-10 border-t-2 border-r-2 border-[#c89b3c]/25 rounded-tr" />
        <div className="hidden xl:block absolute bottom-6 left-0 w-10 h-10 border-b-2 border-l-2 border-[#c89b3c]/25 rounded-bl" />
        <div className="hidden xl:block absolute bottom-6 right-0 w-10 h-10 border-b-2 border-r-2 border-[#c89b3c]/25 rounded-br" />

        <p className="text-xs xl:text-sm font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-3 xl:mb-5">
          Old School RuneScape
        </p>
        <h1 className="text-gradient-gold text-5xl xl:text-8xl 2xl:text-9xl font-black tracking-widest uppercase mb-4 xl:mb-8 leading-none">
          Torta
        </h1>
        <div className="w-16 xl:w-40 h-px mx-auto bg-gradient-to-r from-transparent via-[#c89b3c]/50 to-transparent" />
        <p className="hidden xl:block text-xs font-semibold uppercase tracking-[0.25em] text-[#4a4a70] mt-6">
          EST. 2026 &nbsp;·&nbsp; Clan Tracker
        </p>
      </div>

      {/* ── Recent Activity (mobile + tablet — hidden at xl, shown in sidebar) ── */}
      <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <RecentDropCard drop={recentDrop} />
        <RecentPlankCard plank={recentPlank} />
      </div>

      {/* ── Main content + sidebar ── */}
      <div className="xl:flex xl:gap-8 xl:items-start">

        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-8">

          {/* Competitions */}
          {hasEvents && (
            <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
              <h2 className="font-semibold text-[#e8e8f0] mb-4">⚔️ Competitions</h2>

              {activeComps.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#57f287] mb-3">🟢 Live Now</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {activeComps.map(comp => {
                      const daysLeft = Math.ceil((new Date(comp.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      const top5 = (comp.participations ?? []).filter(p => p.progress.gained > 0).slice(0, 5)
                      return (
                        <div key={comp.id} className="rounded-lg bg-[#0f0f1e] border border-[#333358] p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">{comp.title}</p>
                            <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-[#57f287]/10 text-[#57f287]">LIVE</span>
                          </div>
                          <p className="text-lg font-bold text-[#e8e8f0]">{formatMetric(comp.metric)}</p>
                          <p className="text-xs text-[#7070a0] mt-1 mb-3">
                            Ends <ClientDate iso={comp.endsAt} /> · {daysLeft}d left
                          </p>
                          {top5.length > 0 ? (
                            <ul className="space-y-1">
                              {top5.map((p, i) => (
                                <li key={p.player.displayName} className="flex items-center justify-between gap-2 text-sm">
                                  <span className="w-5 shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                                  <span className="flex-1 truncate text-[#e8e8f0] capitalize">{p.player.displayName}</span>
                                  <span className="font-mono text-[#c89b3c]">{formatGained(comp.metric, p.progress.gained)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#7070a0]">No progress yet.</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {upcomingComps.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#7070a0] mb-3">🕐 Upcoming</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {upcomingComps.map(comp => (
                      <div key={comp.id} className="rounded-lg bg-[#0f0f1e] border border-[#333358] p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">{comp.title}</p>
                          <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-[#7070a0]/15 text-[#7070a0]">
                            in {timeUntilLabel(comp.startsAt)}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-[#e8e8f0]">{formatMetric(comp.metric)}</p>
                        <p className="text-xs text-[#7070a0] mt-1">Starts <ClientDate iso={comp.startsAt} /></p>
                        <p className="text-xs text-[#7070a0]">Ends <ClientDate iso={comp.endsAt} /></p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mini leaderboards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
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
              <Link href="/feed?section=loot" className="mt-4 block text-center text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors">
                View full leaderboard →
              </Link>
            </div>

            <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
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
              <Link href="/feed?section=deaths" className="mt-4 block text-center text-xs text-[#7070a0] hover:text-[#cc5555] transition-colors">
                View full leaderboard →
              </Link>
            </div>
          </div>

          {/* Achievements */}
          <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#e8e8f0]">🏆 Clan Achievements</h2>
              <Link href="/feed?section=achievements" className="text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors">
                View all →
              </Link>
            </div>
            {achievements.length === 0 ? (
              <p className="text-sm text-[#7070a0]">No achievements recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {achievements.map(a => (
                  <li key={a.id} className="flex flex-col gap-0.5 border-b border-[#333358] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
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

        {/* ── Right sidebar (xl+) ── */}
        <div className="hidden xl:flex xl:flex-col gap-4 w-[420px] shrink-0">
          <RecentDropCard drop={recentDrop} />
          <RecentPlankCard plank={recentPlank} />
        </div>
      </div>
    </div>
  )
}
