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

// Non-boss metrics: computed values and activities that aren't boss KCs
const NON_BOSS_METRICS = new Set([
  'ehb', 'ehp', 'ttm', 'tt200m',
  'league_points', 'bounty_hunter_hunter', 'bounty_hunter_rogue',
  'clue_scrolls_all', 'clue_scrolls_beginner', 'clue_scrolls_easy',
  'clue_scrolls_medium', 'clue_scrolls_hard', 'clue_scrolls_elite', 'clue_scrolls_master',
  'last_man_standing', 'pvp_arena', 'soul_wars_zeal',
  'guardians_of_the_rift', 'colosseum_glory', 'collections_logged',
])

export function isBossMetric(metric: string): boolean {
  return !SKILL_METRICS.has(metric) && !NON_BOSS_METRICS.has(metric)
}

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

// All metric gains per player — one bulk call returns every metric for every member
export type PlayerBulkGains = {
  displayName: string
  metrics: Record<string, number>
}

export async function getGroupBulkGained(startDate: string): Promise<Record<string, PlayerBulkGains>> {
  const endDate = new Date().toISOString()
  const data = await womFetch(
    `/groups/${GROUP_ID}/bulk-gained?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
  )
  const rows: unknown[] = Array.isArray(data) ? data : []
  const out: Record<string, PlayerBulkGains> = {}
  for (const row of rows) {
    const r = row as {
      player?: { username?: string; displayName?: string }
      data?: Array<{ metric?: string; gained?: number }>
    }
    const rsn = r.player?.username?.toLowerCase() ?? ''
    if (!rsn) continue
    const metrics: Record<string, number> = {}
    for (const d of r.data ?? []) {
      if (d.metric) metrics[d.metric] = d.gained ?? 0
    }
    out[rsn] = { displayName: r.player?.displayName ?? rsn, metrics }
  }
  return out
}

export type MemberHiscores = {
  displayName: string
  ehb: number
  ehp: number
  skills: Record<string, { level: number; xp: number; rank: number }>
  bosses: Record<string, { kills: number; rank: number }>
  activities: Record<string, { score: number; rank: number }>
}

// Full current snapshot for every group member in one call
export async function getGroupBulkHiscores(): Promise<Record<string, MemberHiscores>> {
  const data = await womFetch(`/groups/${GROUP_ID}/bulk-hiscores`)
  const rows: unknown[] = Array.isArray(data) ? data : []
  const out: Record<string, MemberHiscores> = {}
  for (const row of rows) {
    const r = row as {
      player?: { username?: string; displayName?: string; ehb?: number; ehp?: number }
      data?: { data?: {
        skills?: Record<string, { experience?: number; rank?: number; level?: number }>
        bosses?: Record<string, { kills?: number; rank?: number }>
        activities?: Record<string, { score?: number; rank?: number }>
      }}
    }
    const rsn = r.player?.username?.toLowerCase() ?? ''
    if (!rsn) continue
    const snap = r.data?.data ?? {}
    const skills: Record<string, { level: number; xp: number; rank: number }> = {}
    for (const [k, v] of Object.entries(snap.skills ?? {})) {
      skills[k] = { level: v.level ?? 0, xp: v.experience ?? 0, rank: v.rank ?? -1 }
    }
    const bosses: Record<string, { kills: number; rank: number }> = {}
    for (const [k, v] of Object.entries(snap.bosses ?? {})) {
      bosses[k] = { kills: v.kills ?? -1, rank: v.rank ?? -1 }
    }
    const activities: Record<string, { score: number; rank: number }> = {}
    for (const [k, v] of Object.entries(snap.activities ?? {})) {
      activities[k] = { score: v.score ?? -1, rank: v.rank ?? -1 }
    }
    out[rsn] = {
      displayName: r.player?.displayName ?? rsn,
      ehb: r.player?.ehb ?? 0,
      ehp: r.player?.ehp ?? 0,
      skills, bosses, activities,
    }
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
