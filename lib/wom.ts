const WOM_BASE = 'https://api.wiseoldman.net/v2'
const GROUP_ID = process.env.WOM_GROUP_ID

// Wilderness bosses whose singles-area variant is tracked separately on WOM.
// When both are active simultaneously, their standings are merged for display.
const BOSS_PARTNERS: Record<string, string[]> = {
  callisto: ['artio'],    artio: ['callisto'],
  venenatis: ['spindel'], spindel: ['venenatis'],
  vetion: ['calvarion'],  calvarion: ['vetion'],
  // Raid normal ↔ challenge/hard/expert modes
  chambers_of_xeric: ['chambers_of_xeric_challenge_mode'], chambers_of_xeric_challenge_mode: ['chambers_of_xeric'],
  theatre_of_blood: ['theatre_of_blood_hard_mode'],         theatre_of_blood_hard_mode: ['theatre_of_blood'],
  tombs_of_amascut: ['tombs_of_amascut_expert_mode'],       tombs_of_amascut_expert_mode: ['tombs_of_amascut'],
  the_gauntlet: ['the_corrupted_gauntlet'],                 the_corrupted_gauntlet: ['the_gauntlet'],
  // Group vs solo instance
  nightmare: ['phosani_nightmare'],                         phosani_nightmare: ['nightmare'],
  // Same thematic progression / always done together
  tztok_jad: ['tzkal_zuk'],                                 tzkal_zuk: ['tztok_jad'],
  crazy_archaeologist: ['deranged_archaeologist'],           deranged_archaeologist: ['crazy_archaeologist'],
  // Dagannoth Kings trio
  dagannoth_prime:   ['dagannoth_rex', 'dagannoth_supreme'],
  dagannoth_rex:     ['dagannoth_prime', 'dagannoth_supreme'],
  dagannoth_supreme: ['dagannoth_prime', 'dagannoth_rex'],
}

const BOSS_GROUP_LABELS: Record<string, string> = {
  dagannoth_prime:   'Dagannoth Kings',
  dagannoth_rex:     'Dagannoth Kings',
  dagannoth_supreme: 'Dagannoth Kings',
}

function groupLabel(metrics: string[]): string {
  return BOSS_GROUP_LABELS[metrics[0]] ?? metrics.map(formatMetric).join(' + ')
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

export async function getUpcomingCompetitions(): Promise<Competition[]> {
  const data = await womFetch(`/groups/${GROUP_ID}/competitions?limit=20`)
  if (!data) return []
  const now = Date.now()
  const upcoming = (data as Competition[])
    .filter((c) => new Date(c.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  const out: Competition[] = []
  const used = new Set<number>()
  for (const comp of upcoming) {
    if (used.has(comp.id)) continue
    const partnerMetrics = BOSS_PARTNERS[comp.metric] ?? []
    if (partnerMetrics.length > 0) {
      const partners = partnerMetrics
        .map((m) => upcoming.find((c) => c.metric === m && !used.has(c.id)))
        .filter((c): c is Competition => c != null)
      if (partners.length > 0) {
        for (const p of partners) used.add(p.id)
        const allMetrics = [comp.metric, ...partners.map((p) => p.metric)]
        out.push({ ...comp, title: `Boss of the Week — ${groupLabel(allMetrics)}` })
        used.add(comp.id)
        continue
      }
    }
    out.push(comp)
    used.add(comp.id)
  }
  return out.slice(0, 4)
}

export async function getActiveCompetitionsWithStandings(): Promise<CompetitionWithStandings[]> {
  const data = await womFetch(`/groups/${GROUP_ID}/competitions?limit=20`)
  if (!data) return []
  const now = Date.now()
  const active = (data as Competition[]).filter(
    (c) => new Date(c.startsAt).getTime() <= now && now <= new Date(c.endsAt).getTime()
  )
  const fetched = (await Promise.all(active.map((c) => womFetch(`/competitions/${c.id}`)))).filter(Boolean) as CompetitionWithStandings[]

  const out: CompetitionWithStandings[] = []
  const used = new Set<number>()
  for (const comp of fetched) {
    if (used.has(comp.id)) continue
    const partnerMetrics = BOSS_PARTNERS[comp.metric] ?? []
    if (partnerMetrics.length > 0) {
      const partners = partnerMetrics
        .map((m) => fetched.find((c) => c.metric === m && !used.has(c.id)))
        .filter((c): c is CompetitionWithStandings => c != null)
      if (partners.length > 0) {
        for (const p of partners) used.add(p.id)
        const allMetrics = [comp.metric, ...partners.map((p) => p.metric)]
        out.push({
          ...comp,
          title: `Boss of the Week — ${groupLabel(allMetrics)}`,
          participations: mergeParticipations([comp, ...partners]),
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
