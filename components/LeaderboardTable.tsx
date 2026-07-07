import { DropEntry, PlankEntry } from '@/lib/data'
import { formatGp, MEDALS } from '@/lib/utils'

function Rank({ i }: { i: number }) {
  if (i < 3) return <span className="text-lg">{MEDALS[i]}</span>
  return <span className="w-6 text-center text-sm font-medium text-[#7070a0]">{i + 1}</span>
}

export function DropLeaderboardTable({ entries }: { entries: DropEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-12 text-center text-[#7070a0]">No loot recorded yet.</p>
  }
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-[#2a2a4a] text-left text-xs font-semibold uppercase tracking-wider text-[#7070a0]">
          <th className="pb-3 w-10">#</th>
          <th className="pb-3">Player</th>
          <th className="pb-3 text-right">Total Loot</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr
            key={e.name}
            className="border-b border-[#1a1a2e] hover:bg-[#141427] transition-colors"
          >
            <td className="py-3 pr-3">
              <Rank i={i} />
            </td>
            <td className="py-3">
              <span className="font-medium capitalize text-[#e8e8f0]">{e.discordName ?? e.name}</span>
              {e.discordName && <span className="block text-xs text-[#4a4a70] capitalize">{e.name}</span>}
            </td>
            <td className="py-3 text-right font-mono font-semibold text-[#c89b3c]">
              {formatGp(e.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PlankLeaderboardTable({ entries }: { entries: PlankEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-12 text-center text-[#7070a0]">No deaths recorded yet.</p>
  }
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-[#2a2a4a] text-left text-xs font-semibold uppercase tracking-wider text-[#7070a0]">
          <th className="pb-3 w-10">#</th>
          <th className="pb-3">Player</th>
          <th className="pb-3 text-right">Deaths</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr
            key={e.name}
            className="border-b border-[#1a1a2e] hover:bg-[#1e1212] transition-colors"
          >
            <td className="py-3 pr-3">
              <Rank i={i} />
            </td>
            <td className="py-3">
              <span className="font-medium capitalize text-[#e8e8f0]">{e.discordName ?? e.name}</span>
              {e.discordName && <span className="block text-xs text-[#4a4a70] capitalize">{e.name}</span>}
            </td>
            <td className="py-3 text-right font-mono font-semibold text-[#cc5555]">
              {e.count} 💀
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
