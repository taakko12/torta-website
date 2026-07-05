'use client'

import { useState, useEffect, useRef } from 'react'
import { formatMetric } from '@/lib/wom'

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = { id: string; position: number; title: string; image_url: string | null; points: number; required_count: number }
type Team = { id: string; name: string; color: string }
type Member = { rsn: string; teamId: string }

interface Props {
  tasks: Task[]
  teams: Team[]
  members: Member[]
  // rsn.toLowerCase() → points earned from submissions
  playerPoints: Record<string, number>
  // teamId → { points, completedCount }
  teamStats: Record<string, { points: number; completedCount: number }>
  // rsn.toLowerCase() → EHB gained (from WOM, may be 0 if WOM unavailable)
  memberEhb: Record<string, number>
  // rsn.toLowerCase() → taskId → submission count
  taskProgressByMember: Record<string, Record<string, number>>
  // bosses active this event (had any KC gained) — determines which columns to show
  activeBosses: string[]
  // rsn.toLowerCase() → boss metric → current total KC from hiscores (accurate, matches WOM)
  bossKills: Record<string, Record<string, number>>
  womAvailable: boolean
}

type SortDir = 'asc' | 'desc'
type View = 'players' | 'teams' | 'matrix' | 'ehb'

type EhbSeries = {
  teams: { team: Team; points: { t: number; ehb: number }[] }[]
  players: { rsn: string; teamId: string; color: string; points: { t: number; ehb: number }[] }[]
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function luck(pts: number, ehb: number) {
  if (!ehb) return null
  return pts / ehb
}

function fmtLuck(l: number | null) {
  if (l === null) return '—'
  return l.toFixed(2)
}

function Avatar({ name, color }: { name: string; color?: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
      style={{ backgroundColor: color ?? '#2a2a4a', color: color ? '#07070f' : '#a0a0c0' }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

type ColKey = 'name' | 'points' | 'ehb' | 'luck'

function SortHeader({ col, label, sort, setSort }: {
  col: ColKey; label: string
  sort: { col: ColKey; dir: SortDir }
  setSort: (s: { col: ColKey; dir: SortDir }) => void
}) {
  const active = sort.col === col
  const toggle = () => setSort({ col, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest hover:text-[#e8e8f0] transition-colors"
      style={{ color: active ? '#c89b3c' : '#4a4a70' }}
    >
      {label}
      <span className="text-[9px]">{active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}</span>
    </button>
  )
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

type ChartSeries = { name: string; color: string; points: { t: number; ehb: number }[] }

function LineChart({ series }: { series: ChartSeries[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const activeSeries = series.filter(s => s.points.length >= 1)
  if (!activeSeries.length) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-[#252540] bg-[#0d0d1e]">
        <p className="text-sm text-[#4a4a70]">No snapshot data available for this period.</p>
      </div>
    )
  }

  const VW = 900, VH = 300
  const pad = { top: 15, right: 20, bottom: 50, left: 50 }
  const W = VW - pad.left - pad.right
  const H = VH - pad.top - pad.bottom

  const allTs = activeSeries.flatMap(s => s.points.map(p => p.t))
  const allEhb = activeSeries.flatMap(s => s.points.map(p => p.ehb))
  const minT = Math.min(...allTs)
  const maxT = Math.max(...allTs, minT + 1)
  const maxEhb = Math.max(...allEhb, 1)

  const toX = (t: number) => pad.left + ((t - minT) / (maxT - minT)) * W
  const toY = (v: number) => pad.top + H - (v / maxEhb) * H

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxEhb * f)
  const xTicks = Array.from({ length: 5 }).map((_, i) => minT + (maxT - minT) * (i / 4))

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * VW
    // Find nearest point across all series
    let best: { dist: number; text: string; sx: number; sy: number } | null = null
    for (const s of activeSeries) {
      for (const p of s.points) {
        const px = toX(p.t), py = toY(p.ehb)
        const d = Math.abs(px - mx)
        if (!best || d < best.dist) {
          best = { dist: d, text: `${s.name}: ${p.ehb.toFixed(2)} EHB`, sx: px, sy: py }
        }
      }
    }
    if (best && best.dist < 30) {
      const rx = ((best.sx / VW) * rect.width) + rect.left - rect.left
      const ry = ((best.sy / VH) * rect.height)
      setTooltip({ x: rx, y: ry, text: best.text })
    } else setTooltip(null)
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove}
        onMouseLeave={() => setTooltip(null)}
        className="cursor-crosshair"
      >
        {/* Grid */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={pad.left} y1={toY(v)} x2={pad.left + W} y2={toY(v)} stroke="#1a1a30" strokeWidth={1} />
            <text x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fill="#4a4a70" fontSize={11}>{v.toFixed(1)}</text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line x1={toX(t)} y1={pad.top} x2={toX(t)} y2={pad.top + H} stroke="#1a1a30" strokeWidth={1} />
            <text x={toX(t)} y={pad.top + H + 18} textAnchor="middle" fill="#4a4a70" fontSize={10}>
              {new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        ))}
        {/* Y axis label */}
        <text x={14} y={VH / 2} textAnchor="middle" fill="#4a4a70" fontSize={10} transform={`rotate(-90,14,${VH / 2})`}>
          EHB Gained
        </text>

        {/* Lines */}
        {activeSeries.map(s => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              points={s.points.map(p => `${toX(p.t)},${toY(p.ehb)}`).join(' ')}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={toX(p.t)} cy={toY(p.ehb)} r={3} fill={s.color} strokeWidth={1} stroke="#07070f" />
            ))}
          </g>
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0d0d1e] border border-[#2a2a4a] shadow-lg whitespace-nowrap z-10"
          style={{ left: tooltip.x, top: tooltip.y - 36, transform: 'translateX(-50%)' }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {activeSeries.map(s => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs text-[#a0a0c0]">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BingoLeaderboards({
  tasks, teams, members, playerPoints, teamStats, memberEhb, taskProgressByMember, activeBosses, bossKills, womAvailable,
}: Props) {
  const [view, setView] = useState<View>('players')
  const [matrixMode, setMatrixMode] = useState<'tasks' | 'bosses'>('tasks')
  const [playerSort, setPlayerSort] = useState<{ col: ColKey; dir: SortDir }>({ col: 'points', dir: 'desc' })
  const [teamSort, setTeamSort] = useState<{ col: ColKey; dir: SortDir }>({ col: 'points', dir: 'desc' })
  const [search, setSearch] = useState('')
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [ehbData, setEhbData] = useState<EhbSeries | null>(null)
  const [ehbMode, setEhbMode] = useState<'teams' | 'players'>('teams')
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [ehbLoading, setEhbLoading] = useState(false)

  const teamById = Object.fromEntries(teams.map(t => [t.id, t]))
  const teamByRsn = Object.fromEntries(members.map(m => [m.rsn.toLowerCase(), m.teamId]))
  const totalPossible = tasks.reduce((s, t) => s + t.points, 0)

  // Load EHB snapshot data on first tab visit
  useEffect(() => {
    if (view !== 'ehb' || ehbData || ehbLoading) return
    setEhbLoading(true)
    fetch('/api/bingo/ehb-snapshots')
      .then(r => r.json())
      .then((d: EhbSeries) => {
        setEhbData(d)
        // Default: select top 5 players by EHB
        const top5 = [...d.players]
          .sort((a, b) => (b.points[b.points.length - 1]?.ehb ?? 0) - (a.points[a.points.length - 1]?.ehb ?? 0))
          .slice(0, 5)
          .map(p => p.rsn.toLowerCase())
        setSelectedPlayers(new Set(top5))
      })
      .finally(() => setEhbLoading(false))
  }, [view, ehbData, ehbLoading])

  // ── PLAYER rows ─────────────────────────────────────────────────────────────

  const allPlayers = Object.entries(playerPoints).map(([rsn, pts]) => {
    const ehb = memberEhb[rsn] ?? 0
    const teamId = teamByRsn[rsn] ?? ''
    const team = teamById[teamId] ?? null
    return { rsn, displayRsn: members.find(m => m.rsn.toLowerCase() === rsn)?.rsn ?? rsn, pts, ehb, lk: luck(pts, ehb), team }
  }).filter(p => p.pts > 0 || p.ehb > 0)

  const filteredPlayers = allPlayers
    .filter(p => !search || p.rsn.includes(search.toLowerCase()) || (p.team?.name ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const { col, dir } = playerSort
      const mul = dir === 'desc' ? -1 : 1
      if (col === 'points') return mul * (a.pts - b.pts)
      if (col === 'ehb') return mul * (a.ehb - b.ehb)
      if (col === 'luck') return mul * ((a.lk ?? -1) - (b.lk ?? -1))
      return mul * a.rsn.localeCompare(b.rsn)
    })

  // ── TEAM rows ───────────────────────────────────────────────────────────────

  const teamRows = teams.map(t => {
    const teamMembers = members.filter(m => m.teamId === t.id)
    const teamEhb = teamMembers.reduce((sum, m) => sum + (memberEhb[m.rsn.toLowerCase()] ?? 0), 0)
    const { points, completedCount } = teamStats[t.id] ?? { points: 0, completedCount: 0 }
    return { team: t, points, completedCount, teamEhb, lk: luck(points, teamEhb), members: teamMembers }
  }).sort((a, b) => {
    const { col, dir } = teamSort
    const mul = dir === 'desc' ? -1 : 1
    if (col === 'points') return mul * (a.points - b.points)
    if (col === 'ehb') return mul * (a.teamEhb - b.teamEhb)
    if (col === 'luck') return mul * ((a.lk ?? -1) - (b.lk ?? -1))
    return mul * a.team.name.localeCompare(b.team.name)
  })

  const toggleTeam = (id: string) => setExpandedTeams(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  // ── EHB chart series ────────────────────────────────────────────────────────

  const teamChartSeries: ChartSeries[] = ehbData?.teams.map(s => ({
    name: s.team.name, color: s.team.color, points: s.points,
  })) ?? []

  const playerChartSeries: ChartSeries[] = (ehbData?.players ?? [])
    .filter(p => selectedPlayers.has(p.rsn.toLowerCase()))
    .map(p => ({
      name: p.rsn,
      color: p.color,
      points: p.points,
    }))

  const VIEWS = [
    { key: 'players' as View, label: 'Player Rankings', icon: '◎' },
    { key: 'teams' as View, label: 'Team Rankings', icon: '◈' },
    { key: 'matrix' as View, label: 'Kill Matrix', icon: '⊞' },
    { key: 'ehb' as View, label: 'EHB Progress', icon: '≈' },
  ]

  return (
    <div className="px-4 md:px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Leaderboards</h1>
        <p className="text-sm text-[#6868a0]">
          Rankings update live as tiles are approved.{' '}
          {!womAvailable && <span className="text-[#c89b3c]/70">EHB data requires WOM_GROUP_ID to be configured.</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
              view === v.key
                ? 'bg-[#c89b3c]/12 text-[#c89b3c] border-[#c89b3c]/30'
                : 'bg-[#0d0d1e] text-[#6868a0] border-[#252540] hover:text-[#e8e8f0] hover:border-[#3a3a60]'
            }`}
          >
            <span>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          PLAYER RANKINGS
          ═══════════════════════════════════════════ */}
      {view === 'players' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a70] text-sm">⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search RSN or team..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0d0d1e] border border-[#252540] text-sm text-[#e8e8f0] placeholder:text-[#3a3a60] focus:outline-none focus:border-[#4a4a70]"
              />
            </div>
            <span className="text-xs text-[#4a4a70]">{filteredPlayers.length} players</span>
          </div>

          <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 620 }}>
                <thead>
                  <tr className="border-b border-[#1a1a30]">
                    <th className="px-4 py-3 text-left w-10"><span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</span></th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader col="name" label="Player" sort={playerSort} setSort={setPlayerSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortHeader col="points" label="Total Points" sort={playerSort} setSort={setPlayerSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortHeader col="ehb" label="Total EHB" sort={playerSort} setSort={setPlayerSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortHeader col="luck" label="Luck" sort={playerSort} setSort={setPlayerSort} />
                    </th>
                    <th className="px-4 py-3 text-left pl-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Team</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((p, i) => {
                    const isTop3 = i < 3
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <tr key={p.rsn} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/50 transition-colors">
                        <td className="px-4 py-3.5">
                          {isTop3
                            ? <span className="text-lg">{medals[i]}</span>
                            : <span className="w-7 h-7 rounded-full border-2 border-[#2a2a4a] flex items-center justify-center text-xs font-bold text-[#4a4a70]">{i + 1}</span>
                          }
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={p.displayRsn} color={p.team?.color} />
                            <span className="text-sm font-semibold text-[#e8e8f0]">{p.displayRsn}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-base font-black text-[#c89b3c]">
                            {p.pts % 1 === 0 ? p.pts.toLocaleString() : p.pts.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-semibold text-[#a0a0c0]">
                            {p.ehb > 0 ? p.ehb.toFixed(2) : womAvailable ? '0.00' : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-sm font-bold ${p.lk && p.lk > 2 ? 'text-[#57f287]' : p.lk && p.lk > 1 ? 'text-[#c89b3c]' : 'text-[#a0a0c0]'}`}>
                            {fmtLuck(p.lk)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 pl-6">
                          {p.team ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.team.color }} />
                              <span className="text-xs text-[#a0a0c0] font-medium">{p.team.name}</span>
                            </div>
                          ) : <span className="text-xs text-[#3a3a60]">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredPlayers.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#4a4a70]">No players found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TEAM RANKINGS
          ═══════════════════════════════════════════ */}
      {view === 'teams' && (
        <div>
          <p className="text-xs text-[#4a4a70] mb-4">{teams.length} teams · {totalPossible.toLocaleString()} pts total</p>
          <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 700 }}>
                <thead>
                  <tr className="border-b border-[#1a1a30]">
                    <th className="px-4 py-3 text-left w-10"><span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">#</span></th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader col="name" label="Team" sort={teamSort} setSort={setTeamSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortHeader col="points" label="Total Points" sort={teamSort} setSort={setTeamSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Tiles</span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortHeader col="ehb" label="Total EHB" sort={teamSort} setSort={setTeamSort} />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <SortHeader col="luck" label="Luck" sort={teamSort} setSort={setTeamSort} />
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((r, i) => {
                    const isTop3 = i < 3
                    const medals = ['🥇', '🥈', '🥉']
                    const expanded = expandedTeams.has(r.team.id)
                    const pct = totalPossible > 0 ? (r.points / totalPossible) * 100 : 0

                    // Per-member stats for expanded view
                    const memberRows = r.members.map(m => ({
                      ...m,
                      pts: playerPoints[m.rsn.toLowerCase()] ?? 0,
                      ehb: memberEhb[m.rsn.toLowerCase()] ?? 0,
                    })).sort((a, b) => b.pts - a.pts)

                    return (
                      <>
                        <tr
                          key={r.team.id}
                          className="border-b border-[#141427] hover:bg-[#141427]/50 transition-colors cursor-pointer"
                          onClick={() => toggleTeam(r.team.id)}
                        >
                          <td className="px-4 py-4">
                            {isTop3
                              ? <span className="text-lg">{medals[i]}</span>
                              : <div className="w-7 h-7 rounded-full border-2 border-[#2a2a4a] flex items-center justify-center text-xs font-bold text-[#4a4a70]">{i + 1}</div>
                            }
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.team.color }} />
                              <span className="text-sm font-bold text-[#e8e8f0]">{r.team.name}</span>
                              <span className="text-xs text-[#4a4a70]">· {r.members.length}</span>
                            </div>
                            <div className="pl-5 mt-1.5">
                              <div className="h-1 rounded-full bg-[#141427] overflow-hidden w-40">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: r.team.color }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-base font-black" style={{ color: r.team.color }}>
                              {r.points.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-xs font-semibold text-[#6868a0]">{r.completedCount}/{tasks.length}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm text-[#a0a0c0] font-semibold">
                              {r.teamEhb > 0 ? r.teamEhb.toFixed(2) : womAvailable ? '0.00' : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`text-sm font-bold ${r.lk && r.lk > 2 ? 'text-[#57f287]' : r.lk && r.lk > 1 ? 'text-[#c89b3c]' : 'text-[#a0a0c0]'}`}>
                              {fmtLuck(r.lk)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-xs text-[#4a4a70] transition-transform inline-block" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${r.team.id}-expanded`} className="border-b border-[#141427]">
                            <td colSpan={7} className="bg-[#0a0a18] px-6 py-3">
                              <table className="w-full">
                                <thead>
                                  <tr>
                                    {['Player', 'Points', 'EHB', 'Luck'].map(h => (
                                      <th key={h} className={`text-[10px] font-bold uppercase tracking-widest text-[#4a4a70] pb-2 ${h === 'Player' ? 'text-left' : 'text-right'}`}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {memberRows.map(m => (
                                    <tr key={m.rsn} className="border-t border-[#141427]">
                                      <td className="py-2 text-sm text-[#e8e8f0] font-medium">{m.rsn}</td>
                                      <td className="py-2 text-right text-sm font-bold text-[#c89b3c]">
                                        {m.pts % 1 === 0 ? m.pts.toLocaleString() : m.pts.toFixed(2)}
                                      </td>
                                      <td className="py-2 text-right text-sm text-[#6868a0]">
                                        {m.ehb > 0 ? m.ehb.toFixed(2) : '—'}
                                      </td>
                                      <td className="py-2 text-right text-sm text-[#6868a0]">
                                        {fmtLuck(luck(m.pts, m.ehb))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          KILL MATRIX
          ═══════════════════════════════════════════ */}
      {view === 'matrix' && (() => {
        // Boss columns: active bosses sorted by total current KC across event members
        const bossColumns = activeBosses
          .map(boss => ({ boss, total: members.reduce((s, m) => s + (bossKills[m.rsn.toLowerCase()]?.[boss] ?? 0), 0) }))
          .sort((a, b) => b.total - a.total)
          .map(x => x.boss)

        const matrixMembers = matrixMode === 'tasks'
          ? members.filter(m => Object.keys(taskProgressByMember[m.rsn.toLowerCase()] ?? {}).length > 0)
          : members.filter(m => Object.keys(bossKills[m.rsn.toLowerCase()] ?? {}).length > 0)

        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex rounded-lg border border-[#252540] overflow-hidden">
                {(['tasks', 'bosses'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setMatrixMode(mode)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors capitalize ${
                      matrixMode === mode ? 'bg-[#c89b3c]/15 text-[#c89b3c]' : 'bg-[#0d0d1e] text-[#6868a0] hover:text-[#e8e8f0]'
                    }`}
                  >
                    {mode === 'tasks' ? 'Bingo Tasks' : 'Boss KC (WOM)'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#4a4a70]">
                {matrixMode === 'tasks'
                  ? 'Approved submissions per player per task'
                  : 'Current total KC from hiscores · columns = bosses active this event'}
              </p>
            </div>

            {matrixMode === 'tasks' && (
              <div className="overflow-x-auto rounded-xl border border-[#252540] bg-[#0d0d1e]">
                <table className="border-collapse" style={{ minWidth: `${120 + tasks.length * 52}px` }}>
                  <thead>
                    <tr className="border-b border-[#1a1a30]">
                      <th className="sticky left-0 bg-[#0d0d1e] z-10 px-4 py-3 text-left w-36">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Player</span>
                      </th>
                      {tasks.map(t => (
                        <th key={t.id} className="px-1 py-2 w-12 text-center" title={`#${t.position} — ${t.title}`}>
                          <div className="flex flex-col items-center gap-1">
                            {t.image_url
                              ? <img src={t.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> // eslint-disable-line @next/next/no-img-element
                              : <div className="w-8 h-8 rounded-lg bg-[#141427] flex items-center justify-center text-[10px] text-[#3a3a60]">#{t.position}</div>
                            }
                            <span className="text-[9px] text-[#3a3a60] font-mono">{t.required_count}kc</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right"><span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Total</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixMembers.map(m => {
                      const rsn = m.rsn.toLowerCase()
                      const teamColor = teamById[m.teamId]?.color ?? '#4a4a70'
                      const prog = taskProgressByMember[rsn] ?? {}
                      const totalKills = Object.values(prog).reduce((s, v) => s + v, 0)
                      return (
                        <tr key={m.rsn} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/30 transition-colors">
                          <td className="sticky left-0 bg-[#0d0d1e] z-10 px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                              <span className="text-sm font-semibold text-[#e8e8f0] truncate">{m.rsn}</span>
                            </div>
                          </td>
                          {tasks.map(t => {
                            const count = prog[t.id] ?? 0
                            const pct = Math.min(1, count / t.required_count)
                            const done = count >= t.required_count
                            return (
                              <td key={t.id} className="px-1 py-3 text-center">
                                <div className="flex items-center justify-center">
                                  {count === 0 ? (
                                    <div className="w-8 h-8 rounded-lg border border-[#1a1a30] bg-[#0a0a18] flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-[#1a1a30]" />
                                    </div>
                                  ) : (
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold relative overflow-hidden"
                                      title={`${count}/${t.required_count} ${t.title}`}
                                      style={{ border: `1.5px solid ${done ? teamColor : `${teamColor}60`}` }}
                                    >
                                      <div className="absolute inset-0" style={{ backgroundColor: teamColor, opacity: done ? 0.3 : 0.1 * pct * 3 }} />
                                      <span className="relative z-10" style={{ color: done ? teamColor : '#a0a0c0' }}>
                                        {count >= 100 ? '99+' : count}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-[#c89b3c]">{totalKills}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {matrixMode === 'bosses' && (
              bossColumns.length === 0 ? (
                <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] py-14 text-center">
                  <p className="text-sm text-[#4a4a70]">No boss KC data for this event period. WOM_GROUP_ID must be configured.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#252540] bg-[#0d0d1e]">
                  <table className="border-collapse" style={{ minWidth: `${140 + bossColumns.length * 60}px` }}>
                    <thead>
                      <tr className="border-b border-[#1a1a30]">
                        <th className="sticky left-0 bg-[#0d0d1e] z-10 px-4 py-3 text-left w-36">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Player</span>
                        </th>
                        {bossColumns.map(boss => (
                          <th key={boss} className="px-1 py-2 w-14 text-center" title={formatMetric(boss)}>
                            <div className="text-[9px] text-[#6868a0] font-semibold leading-tight px-1 w-12 mx-auto">
                              {formatMetric(boss).split(' ').map((w, i) => <div key={i}>{w}</div>)}
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right"><span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70]">Total KC</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixMembers
                        .sort((a, b) => {
                          const aTotal = Object.values(bossKills[a.rsn.toLowerCase()] ?? {}).reduce((s, v) => s + v, 0)
                          const bTotal = Object.values(bossKills[b.rsn.toLowerCase()] ?? {}).reduce((s, v) => s + v, 0)
                          return bTotal - aTotal
                        })
                        .map(m => {
                          const rsn = m.rsn.toLowerCase()
                          const teamColor = teamById[m.teamId]?.color ?? '#4a4a70'
                          const kills = bossKills[rsn] ?? {}
                          const totalKc = Object.values(kills).reduce((s, v) => s + v, 0)
                          const maxKc = Math.max(...bossColumns.map(b => kills[b] ?? 0), 1)
                          return (
                            <tr key={m.rsn} className="border-b border-[#141427] last:border-0 hover:bg-[#141427]/30 transition-colors">
                              <td className="sticky left-0 bg-[#0d0d1e] z-10 px-4 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                                  <span className="text-sm font-semibold text-[#e8e8f0] truncate">{m.rsn}</span>
                                </div>
                              </td>
                              {bossColumns.map(boss => {
                                const kc = kills[boss] ?? 0
                                const intensity = kc / maxKc
                                return (
                                  <td key={boss} className="px-1 py-3 text-center">
                                    <div className="flex items-center justify-center">
                                      {kc === 0 ? (
                                        <div className="w-10 h-8 rounded-lg border border-[#1a1a30] bg-[#0a0a18] flex items-center justify-center">
                                          <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a30]" />
                                        </div>
                                      ) : (
                                        <div
                                          className="w-10 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold relative overflow-hidden"
                                          title={`${kc.toLocaleString()} KC — ${formatMetric(boss)}`}
                                          style={{ border: `1.5px solid ${teamColor}80` }}
                                        >
                                          <div className="absolute inset-0" style={{ backgroundColor: teamColor, opacity: 0.08 + intensity * 0.25 }} />
                                          <span className="relative z-10 text-[#e8e8f0]">
                                            {kc >= 10000 ? `${Math.round(kc / 1000)}k` : kc >= 1000 ? `${(kc / 1000).toFixed(1)}k` : kc}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold text-[#c89b3c]">{totalKc.toLocaleString()}</span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )
      })()}

      {/* ═══════════════════════════════════════════
          EHB PROGRESS
          ═══════════════════════════════════════════ */}
      {view === 'ehb' && (
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex rounded-lg border border-[#252540] overflow-hidden">
              {(['teams', 'players'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setEhbMode(m)}
                  className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                    ehbMode === m ? 'bg-[#c89b3c]/15 text-[#c89b3c]' : 'bg-[#0d0d1e] text-[#6868a0] hover:text-[#e8e8f0]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {!womAvailable && (
              <span className="text-xs text-[#c89b3c]/70 bg-[#c89b3c]/8 border border-[#c89b3c]/20 px-3 py-1.5 rounded-lg">
                WOM_GROUP_ID not set — EHB data unavailable
              </span>
            )}
          </div>

          {ehbLoading ? (
            <div className="flex items-center justify-center h-64 rounded-xl border border-[#252540] bg-[#0d0d1e]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#c89b3c]/30 border-t-[#c89b3c] rounded-full animate-spin" />
                <p className="text-sm text-[#4a4a70]">Fetching EHB snapshots from WOM…</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-5 flex-col lg:flex-row">
              {ehbMode === 'players' && (
                <div className="lg:w-56 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70] mb-2">Select Players</p>
                  <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] overflow-y-auto" style={{ maxHeight: 360 }}>
                    {(ehbData?.players ?? [])
                      .sort((a, b) => (b.points[b.points.length - 1]?.ehb ?? 0) - (a.points[a.points.length - 1]?.ehb ?? 0))
                      .map(p => {
                        const checked = selectedPlayers.has(p.rsn.toLowerCase())
                        return (
                          <label key={p.rsn} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#1a1a30] last:border-0 cursor-pointer hover:bg-[#141427] transition-colors">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setSelectedPlayers(prev => {
                                const n = new Set(prev)
                                n.has(p.rsn.toLowerCase()) ? n.delete(p.rsn.toLowerCase()) : n.add(p.rsn.toLowerCase())
                                return n
                              })}
                              className="rounded w-3.5 h-3.5 accent-[#c89b3c]"
                            />
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-xs text-[#e8e8f0] font-medium truncate flex-1">{p.rsn}</span>
                            <span className="text-[10px] text-[#4a4a70] shrink-0">
                              {(p.points[p.points.length - 1]?.ehb ?? 0).toFixed(1)}
                            </span>
                          </label>
                        )
                      })}
                    {!ehbData?.players.length && (
                      <p className="px-3 py-4 text-xs text-[#4a4a70]">No snapshot data found.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] p-4">
                  <LineChart series={ehbMode === 'teams' ? teamChartSeries : playerChartSeries} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
