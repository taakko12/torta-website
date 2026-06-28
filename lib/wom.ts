const WOM_BASE = 'https://api.wiseoldman.net/v2'
const GROUP_ID = process.env.WOM_GROUP_ID

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

export async function getActiveCompetitionsWithStandings(): Promise<CompetitionWithStandings[]> {
  const data = await womFetch(`/groups/${GROUP_ID}/competitions?limit=20`)
  if (!data) return []
  const now = Date.now()
  const active = (data as Competition[]).filter(
    (c) => new Date(c.startsAt).getTime() <= now && now <= new Date(c.endsAt).getTime()
  )
  const results = await Promise.all(active.map((c) => womFetch(`/competitions/${c.id}`)))
  return results.filter(Boolean) as CompetitionWithStandings[]
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
