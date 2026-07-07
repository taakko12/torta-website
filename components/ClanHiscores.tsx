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

type Tab = 'overall' | 'bosses' | 'skills'
type Dir = 'asc' | 'desc'

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

const DEFAULT_COL: Record<Tab, string> = { overall: 'ehb', bosses: 'kc', skills: 'level' }

const medal = (i: number) =>
  i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs text-[#4a4a70]">#{i + 1}</span>

export default function ClanHiscores({ members }: { members: MemberRow[] }) {
  const [tab, setTabRaw] = useState<Tab>('overall')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState(DEFAULT_COL.overall)
  const [sortDir, setSortDir] = useState<Dir>('desc')
  const [activeBoss, setActiveBoss] = useState<string | null>(null)
  const [activeSkill, setActiveSkill] = useState('overall')

  function setTab(t: Tab) {
    setTabRaw(t)
    setSortCol(DEFAULT_COL[t])
    setSortDir('desc')
  }

  function sortBy(col: string) {
    if (col === sortCol) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  // Returns a <th> — called as a function, not a component, so React doesn't remount it on sort changes
  function th(col: string, label: string, align: 'left' | 'right' = 'right') {
    const active = sortCol === col
    const arrow = active ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''
    return (
      <th
        key={col}
        onClick={() => sortBy(col)}
        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors whitespace-nowrap
          ${align === 'left' ? 'text-left' : 'text-right'}
          ${active ? 'text-[#c89b3c]' : 'text-[#4a4a70] hover:text-[#8080b0]'}`}
      >
        {label}{arrow}
      </th>
    )
  }

  const bossRanking = (() => {
    const totals: Record<string, number> = {}
    for (const m of members)
      for (const [b, { kills }] of Object.entries(m.bosses))
        if (kills > 0) totals[b] = (totals[b] ?? 0) + kills
    return Object.keys(totals).sort((a, b) => a.localeCompare(b))
  })()

  const selectedBoss = activeBoss ?? bossRanking[0] ?? null
  const filtered = members.filter(m => !search || m.displayName.toLowerCase().includes(search.toLowerCase()))

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === 'desc' ? -1 : 1
    switch (sortCol) {
      case 'name':       return mul * a.displayName.localeCompare(b.displayName)
      case 'ehb':        return mul * (a.ehb - b.ehb)
      case 'ehp':        return mul * (a.ehp - b.ehp)
      case 'totalLevel': return mul * ((a.skills.overall?.level ?? 0) - (b.skills.overall?.level ?? 0))
      case 'totalXp':    return mul * ((a.skills.overall?.xp ?? 0) - (b.skills.overall?.xp ?? 0))
      case 'kc':         return mul * ((a.bosses[selectedBoss ?? '']?.kills ?? -1) - (b.bosses[selectedBoss ?? '']?.kills ?? -1))
      case 'bossRank': {
        const ar = a.bosses[selectedBoss ?? '']?.rank ?? 999999
        const br = b.bosses[selectedBoss ?? '']?.rank ?? 999999
        return -mul * (ar - br) // lower rank = better; invert so desc=rank1 first
      }
      case 'level':    return mul * ((a.skills[activeSkill]?.level ?? 0) - (b.skills[activeSkill]?.level ?? 0))
      case 'xp':       return mul * ((a.skills[activeSkill]?.xp ?? 0) - (b.skills[activeSkill]?.xp ?? 0))
      case 'skillRank': {
        const ar = a.skills[activeSkill]?.rank ?? 999999
        const br = b.skills[activeSkill]?.rank ?? 999999
        return -mul * (ar - br)
      }
      default: return 0
    }
  })

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'bosses', label: 'Bosses' },
    { key: 'skills', label: 'Skills' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Clan Hiscores</h1>
          <p className="text-sm text-[#6868a0]">{members.length} tracked members · synced from Wise Old Man</p>
        </div>
        <div className="relative w-full sm:w-56">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a70] text-sm">⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search RSN..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#161628] border border-[#2c2c4e] text-sm text-[#e8e8f0] placeholder:text-[#424268] focus:outline-none focus:border-[#4a4a70]" />
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              tab === t.key
                ? 'bg-[#c89b3c]/12 text-[#c89b3c] border-[#c89b3c]/30'
                : 'bg-[#161628] text-[#6868a0] border-[#2c2c4e] hover:text-[#e8e8f0] hover:border-[#424268]'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Boss selector */}
      {tab === 'bosses' && (
        <div className="mb-4">
          {bossRanking.length === 0 ? (
            <p className="text-sm text-[#4a4a70]">No boss KC data available.</p>
          ) : (
            <select value={selectedBoss ?? ''} onChange={e => { setActiveBoss(e.target.value); setSortCol('kc'); setSortDir('desc') }}
              className="px-3 py-2 rounded-lg bg-[#161628] border border-[#2c2c4e] text-sm text-[#e8e8f0] focus:outline-none focus:border-[#4a4a70] w-56">
              {bossRanking.map(boss => <option key={boss} value={boss}>{formatMetric(boss)}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Skill selector */}
      {tab === 'skills' && (
        <div className="mb-4">
          <select value={activeSkill} onChange={e => { setActiveSkill(e.target.value); setSortCol('level'); setSortDir('desc') }}
            className="px-3 py-2 rounded-lg bg-[#161628] border border-[#2c2c4e] text-sm text-[#e8e8f0] focus:outline-none focus:border-[#4a4a70] w-56">
            {SKILLS.map(s => <option key={s} value={s}>{SKILL_ICONS[s]} {formatMetric(s)}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] overflow-hidden">
        <div className="overflow-x-auto">

          {tab === 'overall' && (
            <table className="w-full">
              <thead><tr className="border-b border-[#21213c]">
                <th className="px-4 py-3 text-left w-12 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                {th('name', 'Player', 'left')}
                {th('ehb', 'EHB')}
                {th('ehp', 'EHP')}
                {th('totalLevel', 'Total Level')}
                {th('totalXp', 'Total XP')}
              </tr></thead>
              <tbody>
                {sorted.map((m, i) => (
                  <tr key={m.rsn} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50 transition-colors">
                    <td className="px-4 py-3.5">{medal(i)}</td>
                    <td className="px-4 py-3.5">
                      <a href={`/player/${encodeURIComponent(m.displayName)}`}
                        className="text-sm font-semibold text-[#e8e8f0] hover:text-[#c89b3c] transition-colors">{m.displayName}</a>
                    </td>
                    <td className="px-4 py-3.5 text-right"><span className="text-base font-black text-[#c89b3c]">{m.ehb.toFixed(2)}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-sm text-[#a0a0c0] font-semibold">{m.ehp.toFixed(2)}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-sm text-[#a0a0c0]">{(m.skills.overall?.level ?? 0).toLocaleString()}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-sm text-[#6868a0]">{(m.skills.overall?.xp ?? 0).toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'bosses' && selectedBoss && (
            <table className="w-full">
              <thead><tr className="border-b border-[#21213c]">
                <th className="px-4 py-3 text-left w-12 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                {th('name', 'Player', 'left')}
                {th('kc', `${formatMetric(selectedBoss)} KC`)}
                {th('bossRank', 'WOM Rank')}
                {th('ehb', 'EHB')}
              </tr></thead>
              <tbody>
                {sorted.map((m, i) => {
                  const data = m.bosses[selectedBoss]
                  if ((data?.kills ?? -1) < 0) return null
                  return (
                    <tr key={m.rsn} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50 transition-colors">
                      <td className="px-4 py-3.5">{medal(i)}</td>
                      <td className="px-4 py-3.5">
                        <a href={`/player/${encodeURIComponent(m.displayName)}`}
                          className="text-sm font-semibold text-[#e8e8f0] hover:text-[#c89b3c] transition-colors">{m.displayName}</a>
                      </td>
                      <td className="px-4 py-3.5 text-right"><span className="text-base font-black text-[#c89b3c]">{(data?.kills ?? 0).toLocaleString()}</span></td>
                      <td className="px-4 py-3.5 text-right"><span className="text-sm text-[#6868a0]">{data?.rank && data.rank > 0 ? `#${data.rank.toLocaleString()}` : '—'}</span></td>
                      <td className="px-4 py-3.5 text-right"><span className="text-sm text-[#a0a0c0]">{m.ehb.toFixed(2)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {tab === 'skills' && (
            <table className="w-full">
              <thead><tr className="border-b border-[#21213c]">
                <th className="px-4 py-3 text-left w-12 text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</th>
                {th('name', 'Player', 'left')}
                {th('level', activeSkill === 'overall' ? 'Total Level' : 'Level')}
                {th('xp', 'XP')}
                {th('skillRank', 'WOM Rank')}
              </tr></thead>
              <tbody>
                {sorted.map((m, i) => {
                  const data = m.skills[activeSkill]
                  return (
                    <tr key={m.rsn} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50 transition-colors">
                      <td className="px-4 py-3.5">{medal(i)}</td>
                      <td className="px-4 py-3.5">
                        <a href={`/player/${encodeURIComponent(m.displayName)}`}
                          className="text-sm font-semibold text-[#e8e8f0] hover:text-[#c89b3c] transition-colors">{m.displayName}</a>
                      </td>
                      <td className="px-4 py-3.5 text-right"><span className="text-base font-black text-[#c89b3c]">{(data?.level ?? 0).toLocaleString()}</span></td>
                      <td className="px-4 py-3.5 text-right"><span className="text-sm text-[#6868a0]">{(data?.xp ?? 0).toLocaleString()}</span></td>
                      <td className="px-4 py-3.5 text-right"><span className="text-sm text-[#6868a0]">{data?.rank && data.rank > 0 ? `#${data.rank.toLocaleString()}` : '—'}</span></td>
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
