const WOM_BASE = 'https://api.wiseoldman.net/v2'
const GROUP_ID = process.env.WOM_GROUP_ID

// Wilderness bosses whose singles-area variant is tracked separately on WOM.
// When both are active simultaneously, their standings are merged for display.
const BOSS_PAIRS: Record<string, string> = {
  callisto: 'artio',    artio: 'callisto',
  venenatis: 'spindel', spindel: 'venenatis',
  vetion: 'calvarion',  calvarion: 'vetion',
}

const SKILL_METRICS = new Set([
  'overall', 'attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer',
  'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking',
  'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving',
  'slayer', 'farming', 'runecrafting', 'hunter', 'construction', 'sailing',
])

export interface Competition {
  id: number
  title: string
  metric: string
  startsAt: string
  endsAt: string
}

export interface Participant {
  player: { displayName: string }
  progress: { gained: number }
}

export interface CompetitionWithStandings extends Competition {
  participations: Participant[]
}

async function womFetch(path: string) {
  if (!GROUP_ID) return null
  try {
    const res = await fetch(`${WOM_BASE}${path}`, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'torta-clan-website' },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function mergeParticipations(comps: CompetitionWithStandings[]): Participant[] {
  const byPlayer = new Map<string, Participant>()
  for (const comp of comps) {
    for (const p of comp.participations ?? []) {
      const key = p.player.displayName.toLowerCase()
      if (!byPlayer.has(key)) {
        byPlayer.set(key, { player: p.player, progress: { gained: 0 } })
      }
      byPlayer.get(key)!.progress.gained += p.progress.gained
    }
  }
  return [...byPlayer.values()].sort((a, b) => b.progress.gained - a.progress.gained)
}

export async function getActiveCompetitionsWithStandings(): Promise<CompetitionWithStandings[]> {
  const data = await womFetch(`/groups/${GROUP_ID}/competitions?limit=20`)
  if (!data) return []
  const now = Date.now()
  const active = (data as Competition[]).filter(
    (c) => new Date(c.startsAt).getTime() <= now && now <= new Date(c.endsAt).getTime()
  )
  const fetched = (await Promise.all(active.map((c) => womFetch(`/competitions/${c.id}`)))).filter(Boolean) as CompetitionWithStandings[]

  // Group paired boss comps into one merged entry so the homepage shows one card.
  const out: CompetitionWithStandings[] = []
  const used = new Set<number>()
  for (const comp of fetched) {
    if (used.has(comp.id)) continue
    const pairMetric = BOSS_PAIRS[comp.metric]
    if (pairMetric) {
      const pair = fetched.find((c) => c.metric === pairMetric && !used.has(c.id))
      if (pair) {
        used.add(pair.id)
        out.push({
          ...comp,
          title: `Boss of the Week — ${formatMetric(comp.metric)} + ${formatMetric(pairMetric)}`,
          metric: comp.metric,
          participations: mergeParticipations([comp, pair]),
        })
        used.add(comp.id)
        continue
      }
    }
    out.push(comp)
    used.add(comp.id)
  }
  return out
}

export function formatMetric(metric: string): string {
  return metric.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatGained(metric: string, gained: number): string {
  const unit = SKILL_METRICS.has(metric) ? 'XP' : 'KC'
  if (gained >= 1_000_000) return `${(gained / 1_000_000).toFixed(1)}M ${unit}`
  if (gained >= 1_000) return `${(gained / 1_000).toFixed(1)}K ${unit}`
  return `${gained.toLocaleString()} ${unit}`
}
