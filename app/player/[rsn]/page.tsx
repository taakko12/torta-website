import { getPlayerStats } from '@/lib/data'
import { ClientDate } from '@/components/ClientDate'
import { MEDALS, formatGp } from '@/lib/utils'

export const revalidate = 60

type Props = { params: Promise<{ rsn: string }> }

async function fetchWom(rsn: string) {
  try {
    const res = await fetch(`https://api.wiseoldman.net/v2/players/${encodeURIComponent(rsn)}`, {
      headers: { 'User-Agent': 'torta-clan-website' },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export default async function PlayerPage({ params }: Props) {
  const { rsn } = await params
  const displayName = decodeURIComponent(rsn)

  const [stats, wom] = await Promise.all([
    getPlayerStats(displayName),
    fetchWom(displayName),
  ])

  const skills = wom?.latestSnapshot?.data?.skills
  const computed = wom?.latestSnapshot?.data?.computed

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#c89b3c] uppercase tracking-widest mb-1 capitalize">
          {wom?.displayName ?? displayName}
        </h1>
        {wom && (
          <a
            href={`https://wiseoldman.net/players/${encodeURIComponent(wom.username)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors"
          >
            View on Wise Old Man →
          </a>
        )}
      </div>

      <div className="space-y-4">

        {/* WOM stats */}
        {wom && skills && (
          <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
            <h2 className="font-semibold text-[#e8e8f0] mb-4">🌍 Wise Old Man</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#7070a0] mb-1">Total Level</p>
                <p className="text-lg font-bold text-[#e8e8f0]">{skills.overall?.level ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[#7070a0] mb-1">EHP</p>
                <p className="text-lg font-bold text-[#e8e8f0]">
                  {computed?.ehp?.value != null ? Math.round(computed.ehp.value).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7070a0] mb-1">EHB</p>
                <p className="text-lg font-bold text-[#e8e8f0]">
                  {computed?.ehb?.value != null ? Math.round(computed.ehb.value).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loot */}
        <div className="rounded-xl border border-[#c89b3c]/25 bg-[#161628] p-5">
          <h2 className="font-semibold text-[#e8e8f0] mb-4">💰 Loot</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-[#7070a0] mb-1">All Time</p>
              <p className="text-lg font-bold text-[#c89b3c]">{formatGp(stats.totalGp)}</p>
            </div>
            <div>
              <p className="text-xs text-[#7070a0] mb-1">This Month</p>
              <p className="text-lg font-bold text-[#c89b3c]">{formatGp(stats.monthlyGp)}</p>
            </div>
            <div>
              <p className="text-xs text-[#7070a0] mb-1">Drops</p>
              <p className="text-lg font-bold text-[#e8e8f0]">{stats.dropCount.toLocaleString()}</p>
            </div>
          </div>
          {stats.topDrops.length > 0 && (
            <ul className="space-y-1">
              {stats.topDrops.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="w-5 shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                  <span className="flex-1 text-[#e8e8f0] truncate">{d.item_name ?? 'Unknown'}</span>
                  <span className="font-mono text-[#c89b3c]">{formatGp(Number(d.gp_value))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Deaths */}
        <div className="rounded-xl border border-[#cc5555]/25 bg-[#161628] p-5">
          <h2 className="font-semibold text-[#e8e8f0] mb-4">💀 Deaths</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#7070a0] mb-1">All Time</p>
              <p className="text-lg font-bold text-[#cc5555]">{stats.totalDeaths.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[#7070a0] mb-1">This Month</p>
              <p className="text-lg font-bold text-[#cc5555]">{stats.monthlyDeaths.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {stats.achievements.length > 0 && (
          <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
            <h2 className="font-semibold text-[#e8e8f0] mb-4">🏅 Recent Achievements</h2>
            <ul className="divide-y divide-[#333358]">
              {stats.achievements.map(a => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">{a.title}</span>
                    <span className="text-xs text-[#7070a0] shrink-0"><ClientDate iso={a.recorded_at} /></span>
                  </div>
                  <p className="text-xs text-[#7070a0]">{a.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats.totalGp === 0 && stats.totalDeaths === 0 && stats.achievements.length === 0 && !wom && (
          <div className="rounded-xl border border-[#333358] bg-[#161628] p-5 text-center">
            <p className="text-[#7070a0]">No data found for <span className="text-[#e8e8f0] capitalize">{displayName}</span>.</p>
          </div>
        )}
      </div>
    </div>
  )
}
