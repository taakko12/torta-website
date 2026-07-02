import Link from 'next/link'
import Image from 'next/image'
import {
  getMostRecentDrop,
  getMostRecentPlank,
  getMonthlyDropLeaderboard,
  getMonthlyPlankLeaderboard,
  getRecentAchievements,
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

export default async function Home() {
  const [recentDrop, recentPlank, topDrops, topPlanks, activeComps, upcomingComps, achievements] = await Promise.all([
    getMostRecentDrop(),
    getMostRecentPlank(),
    getMonthlyDropLeaderboard(),
    getMonthlyPlankLeaderboard(),
    getActiveCompetitionsWithStandings(),
    getUpcomingCompetitions(),
    getRecentAchievements(),
  ])

  const month = currentMonthLabel()
  const hasEvents = activeComps.length > 0 || upcomingComps.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">

      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-widest uppercase text-[#c89b3c] mb-2">
          Torta
        </h1>
        <p className="text-[#7070a0] text-sm tracking-wide uppercase">Old School RuneScape</p>
      </div>

      {/* Competitions — Active + Upcoming */}
      {hasEvents && (
        <div className="mb-10 rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
          <h2 className="font-semibold text-[#e8e8f0] mb-4">⚔️ Competitions</h2>

          {/* Active */}
          {activeComps.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#57f287] mb-3">
                🟢 Live Now
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {activeComps.map((comp) => {
                  const daysLeft = Math.ceil((new Date(comp.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const top3 = (comp.participations ?? []).filter(p => p.progress.gained > 0).slice(0, 3)
                  return (
                    <div key={comp.id} className="rounded-lg bg-[#07070f] border border-[#2a2a4a] p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
                          {comp.title}
                        </p>
                        <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-[#57f287]/10 text-[#57f287]">
                          LIVE
                        </span>
                      </div>
                      <p className="text-lg font-bold text-[#e8e8f0]">{formatMetric(comp.metric)}</p>
                      <p className="text-xs text-[#7070a0] mt-1 mb-3">
                        Ends <ClientDate iso={comp.endsAt} /> · {daysLeft}d left
                      </p>
                      {top3.length > 0 ? (
                        <ul className="space-y-1">
                          {top3.map((p, i) => (
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

          {/* Upcoming */}
          {upcomingComps.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#7070a0] mb-3">
                🕐 Upcoming
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingComps.map((comp) => (
                  <div key={comp.id} className="rounded-lg bg-[#07070f] border border-[#2a2a4a] p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
                        {comp.title}
                      </p>
                      <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-[#7070a0]/15 text-[#7070a0]">
                        in {timeUntilLabel(comp.startsAt)}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#e8e8f0]">{formatMetric(comp.metric)}</p>
                    <p className="text-xs text-[#7070a0] mt-1">
                      Starts <ClientDate iso={comp.startsAt} />
                    </p>
                    <p className="text-xs text-[#7070a0]">
                      Ends <ClientDate iso={comp.endsAt} />
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">

        {/* Recent Drop */}
        <div className="rounded-xl border border-[#c89b3c]/25 bg-[#0e0e1c] p-5 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-3">
            💰 Most Recent Drop
          </p>
          {recentDrop ? (
            <>
              <div className="flex items-start gap-3">
                {recentDrop.image_url && (
                  <Image
                    src={recentDrop.image_url}
                    alt={recentDrop.item_name ?? 'drop'}
                    width={40}
                    height={40}
                    className="rounded mt-1 shrink-0 object-contain"
                    unoptimized
                  />
                )}
                <div>
                  <p className="text-xl font-bold capitalize text-[#e8e8f0]">{recentDrop.player_name}</p>
                  <p className="text-2xl font-mono font-semibold text-[#f0c060] mt-1">
                    {formatGp(recentDrop.gp_value)}
                  </p>
                  {recentDrop.item_name && recentDrop.item_name !== 'Monthly aggregate' && (
                    <p className="text-sm text-[#7070a0] mt-1">{recentDrop.item_name}</p>
                  )}
                  <p className="text-xs text-[#7070a0] mt-2">
                    <ClientDate iso={recentDrop.recorded_at} />
                  </p>
                  {discordLink(DROPS_CHANNEL, recentDrop.discord_message_id) && (
                    <a
                      href={discordLink(DROPS_CHANNEL, recentDrop.discord_message_id)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors"
                    >
                      View in Discord →
                    </a>
                  )}
                </div>
              </div>
              {recentDrop.screenshot_url && (
                <div className="mt-auto pt-4">
                  <Image
                    src={recentDrop.screenshot_url}
                    alt="drop screenshot"
                    width={800}
                    height={500}
                    className="w-full rounded-lg object-cover"
                    unoptimized
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-[#7070a0]">No drops recorded yet.</p>
          )}
        </div>

        {/* Recent Plank */}
        <div className="rounded-xl border border-[#cc5555]/25 bg-[#0e0e1c] p-5 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#cc5555] mb-3">
            💀 Most Recent Death
          </p>
          {recentPlank ? (
            <>
              <p className="text-xl font-bold capitalize text-[#e8e8f0]">{recentPlank.player_name}</p>
              <p className="text-xs text-[#7070a0] mt-1">
                <ClientDate iso={recentPlank.recorded_at} />
              </p>
              {discordLink(PLANKS_CHANNEL, recentPlank.discord_message_id) && (
                <a
                  href={discordLink(PLANKS_CHANNEL, recentPlank.discord_message_id)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-[#7070a0] hover:text-[#cc5555] transition-colors"
                >
                  View in Discord →
                </a>
              )}
              {recentPlank.image_url && (
                <div className="mt-auto pt-4">
                  <Image
                    src={recentPlank.image_url}
                    alt="death screenshot"
                    width={800}
                    height={500}
                    className="w-full rounded-lg object-cover"
                    unoptimized
                  />
                </div>
              )}
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

      {/* Clan Achievements */}
      <div className="mt-4 rounded-xl border border-[#2a2a4a] bg-[#0e0e1c] p-5">
        <h2 className="font-semibold text-[#e8e8f0] mb-4">🏆 Clan Achievements</h2>
        {achievements.length === 0 ? (
          <p className="text-sm text-[#7070a0]">No achievements recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {achievements.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 border-b border-[#2a2a4a] pb-3 last:border-0 last:pb-0">
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
  )
}
