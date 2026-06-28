const WOM_BASE = 'https://api.wiseoldman.net/v2'
const GROUP_ID = process.env.WOM_GROUP_ID

export interface Competition {
  id: number
  title: string
  metric: string
  startsAt: string
  endsAt: string
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

export async function getActiveCompetitions(): Promise<Competition[]> {
  const data = await womFetch(`/groups/${GROUP_ID}/competitions?limit=20`)
  if (!data) return []
  const now = Date.now()
  return (data as Competition[]).filter(
    (c) => new Date(c.startsAt).getTime() <= now && now <= new Date(c.endsAt).getTime()
  )
}

export function formatMetric(metric: string): string {
  return metric.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
