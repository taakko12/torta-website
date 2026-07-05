'use client'

import { useState } from 'react'
import { formatMetric } from '@/lib/wom'

type MemberRow = {
  rsn: string
  displayName: string
  ehb: number
  ehp: number
  skills: Record<string, { level: number; xp: number; rank: number }>
  bosses: Record<string, { kills: number; rank: number }>
}

interface Props {
  members: MemberRow[]
}

type Tab = 'overall' | 'bosses' | 'skills'
type SortDir = 'asc' | 'desc'

const SKILLS = [
  'overall', 'attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic',
  'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting', 'smithing',
  'mining', 'herblore', 'agility', 'thieving', 'slayer', 'farming', 'runecrafting',
  'hunter', 'construction', 'sailing',
]

const SKILL_ICONS: Record<string, string> = {
  overall: '⭐', attack: '⚔️', defence: '🛡️', strength: '💪', hitpoints: '❤️',
  ranged: '🏹', prayer: '🙏', magic: '🔮', cooking: '🍳', woodcutting: '🪓',
  fletching: '🪶', fishing: '🎣', firemaking: '🔥', crafting: '🧵', smithing: '⚒️',
  mining: '⛏️', herblore: '🌿', agility: '🏃', thieving: '🗝️', slayer: '💀',
  farming: '🌾', runecrafting: '🔵', hunter: '🦌', construction: '🏠', sailing: '⛵',
}

export default function ClanHiscores({ members }: Props) {
  const [tab, setTab] = useState<Tab>('overall')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [activeBoss, setActiveBoss] = useState<string | null>(null)
  const [activeSkill, setActiveSkill] = useState<string>('overall')

  // All bosses any clan member has killed, sorted by total clan KC
  const bossRanking = (() => {
    const totals: Record<string, number> = {}
    for (const m of members) {
      for (const [boss, { kills }] of Object.entries(m.bosses)) {
        if (kills > 0) totals[boss] = (totals[boss] ?? 0) + kills
      }
    }
    return Object.keys(totals).sort((a, b) => a.localeCompare(b))
  })()

  const selectedBoss = activeBoss ?? bossRanking[0] ?? null

  const filtered = members.filter(m =>
    !search || m.displayName.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === 'desc' ? -1 : 1
    if (tab === 'overall') return mul * (a.ehb - b.ehb)
    if (tab === 'bosses' && selectedBoss) {
      return mul * ((a.bosses[selectedBoss]?.kills ?? -1) - (b.bosses[selectedBoss]?.kills ?? -1))
    }
    if (tab === 'skills') {
      const aVal = activeSkill === 'overall' ? (a.skills['overall']?.level ?? 0) : (a.skills[activeSkill]?.xp ?? 0)
      const bVal = activeSkill === 'overall' ? (b.skills['overall']?.level ?? 0) : (b.skills[activeSkill]?.xp ?? 0)
      return mul * (aVal - bVal)
    }
    return 0
  })

  const toggleDir = () => setSortDir(d => d === 'desc' ? 'asc' : 'desc')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'bosses', label: 'Bosses' },
    { key: 'skills', label: 'Skills' },
  ]

  return (
    <div>
      {/* Header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Clan Hiscores</h1>
          <p className="text-sm text-[#6868a0]">{members.length} tracked members · synced from Wise Old Man</p>
        </div>
        <div className="relative w-full sm:w-56">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a70] text-sm">⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search RSN..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0d0d1e] border border-[#252540] text-sm text-[#e8e8f0] placeholder:text-[#3a3a60] focus:outline-none focus:border-[#4a4a70]"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              tab === t.key
                ? 'bg-[#c89b3c]/12 text-[#c89b3c] border-[#c89b3c]/30'
                : 'bg-[#0d0d1e] text-[#6868a0] border-[#252540] hover:text-[#e8e8f0] hover:border-[#3a3a60]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Boss selector */}
      {tab === 'bosses' && (
        <div className="mb-4">
          {bossRanking.length === 0 ? (
            <p className="text-sm text-[#4a4a70]">No boss KC data available. Make sure WOM_GROUP_ID is set.</p>
          ) : (
            <select
              value={selectedBoss ?? ''}
              onChange={e => setActiveBoss(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0d0d1e] border border-[#252540] text-sm text-[#e8e8f0] focus:outline-none focus:border-[#4a4a70] w-56"
            >
              {bossRanking.map(boss => (
                <option key={boss} value={boss}>{formatMetric(boss)}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Skill selector */}
      {tab === 'skills' && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SKILLS.map(skill => (
            <button
              key={skill}
              onClick={() => setActiveSkill(skill)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                activeSkill === skill
                  ? 'bg-[#7c5ce8]/20 text-[#c89b3c] border-[#7c5ce8]/40'
                  : 'bg-[#141427] text-[#6868a0] border-[#252540] hover:text-[#e8e8f0]'
              }`}
            >
              <span>{SKILL_ICONS[skill]}</span>
              {formatMetric(skill)}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'overall' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a30]">
                  <th className="px-4 py-3 text-left w-12 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Player</th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={toggleDir} className="flex items-center gap-1 ml-auto text-[10px] font-bold uppercase tracking-widest text-[#c89b3c] hover:opacity-80">
                      EHB {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">EHP</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Total Level</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Total XP</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => (
                  <tr key={m.rsn} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' :
                        <span className="text-xs text-[#4a4a70]">#{i + 1}</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href={`/player/${encodeURIComponent(m.displayName)}`}
                        className="text-sm font-semibold text-[#e8e8f0] hover:text-[#c89b3c] transition-colors"
                      >
                        {m.displayName}
                      </a>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-base font-black text-[#c89b3c]">{m.ehb.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-[#a0a0c0] font-semibold">{m.ehp.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-[#a0a0c0]">{(m.skills['overall']?.level ?? 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-[#6868a0]">{(m.skills['overall']?.xp ?? 0).toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'bosses' && selectedBoss && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a30]">
                  <th className="px-4 py-3 text-left w-12 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Player</th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={toggleDir} className="flex items-center gap-1 ml-auto text-[10px] font-bold uppercase tracking-widest text-[#c89b3c] hover:opacity-80">
                      {formatMetric(selectedBoss)} KC {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">WOM Rank</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">EHB</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => {
                  const data = m.bosses[selectedBoss]
                  const kc = data?.kills ?? -1
                  if (kc < 0) return null
                  return (
                    <tr key={m.rsn} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50 transition-colors">
                      <td className="px-4 py-3.5">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' :
                          <span className="text-xs text-[#4a4a70]">#{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <a href={`/player/${encodeURIComponent(m.displayName)}`}
                          className="text-sm font-semibold text-[#e8e8f0] hover:text-[#c89b3c] transition-colors">
                          {m.displayName}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-base font-black text-[#c89b3c]">{kc.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-[#6868a0]">
                          {data?.rank && data.rank > 0 ? `#${data.rank.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-[#a0a0c0]">{m.ehb.toFixed(2)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {tab === 'skills' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a30]">
                  <th className="px-4 py-3 text-left w-12 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Player</th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={toggleDir} className="flex items-center gap-1 ml-auto text-[10px] font-bold uppercase tracking-widest text-[#c89b3c] hover:opacity-80">
                      {activeSkill === 'overall' ? 'Total Level' : `${formatMetric(activeSkill)} Level`} {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">XP</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">WOM Rank</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => {
                  const data = m.skills[activeSkill]
                  return (
                    <tr key={m.rsn} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50 transition-colors">
                      <td className="px-4 py-3.5">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' :
                          <span className="text-xs text-[#4a4a70]">#{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <a href={`/player/${encodeURIComponent(m.displayName)}`}
                          className="text-sm font-semibold text-[#e8e8f0] hover:text-[#c89b3c] transition-colors">
                          {m.displayName}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-base font-black text-[#c89b3c]">
                          {(data?.level ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-[#6868a0]">{(data?.xp ?? 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-[#6868a0]">
                          {data?.rank && data.rank > 0 ? `#${data.rank.toLocaleString()}` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {sorted.length === 0 && (
            <div className="py-14 text-center text-sm text-[#4a4a70]">
              {members.length === 0 ? 'No members tracked. Set WOM_GROUP_ID to enable.' : 'No players match your search.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
