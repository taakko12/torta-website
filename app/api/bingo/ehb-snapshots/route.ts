import { NextResponse } from 'next/server'
import { getActiveEvent, getEventTeams, getTeamMembers } from '@/lib/bingo'

const WOM = 'https://api.wiseoldman.net/v2'

type Snap = { t: number; ehb: number }

async function playerSnapshots(rsn: string, startDate: string): Promise<Snap[]> {
  try {
    const url = `${WOM}/players/${encodeURIComponent(rsn)}/snapshots?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(new Date().toISOString())}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'torta-clan-website' },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json() as Array<{ createdAt: string; data?: { computed?: { ehb?: { value?: number } } } }>
    return (Array.isArray(data) ? data : [])
      .map(s => ({ t: new Date(s.createdAt).getTime(), ehb: s.data?.computed?.ehb?.value ?? 0 }))
      .sort((a, b) => a.t - b.t)
  } catch { return [] }
}

export async function GET() {
  const event = await getActiveEvent()
  if (!event) return NextResponse.json({ teams: [], players: [] })

  const teams = await getEventTeams(event.id)
  const allMembers = await getTeamMembers(teams.map(t => t.id))

  // Fetch snapshots for all players in parallel
  const snapsByRsn: Record<string, Snap[]> = {}
  await Promise.all(allMembers.map(async m => {
    snapsByRsn[m.rsn.toLowerCase()] = await playerSnapshots(m.rsn, event.created_at)
  }))

  // Helper: get EHB for a player at or before time t (step interpolation)
  const ehbAt = (rsn: string, t: number): number => {
    const snaps = snapsByRsn[rsn.toLowerCase()] ?? []
    let val = snaps[0]?.ehb ?? 0
    for (const s of snaps) { if (s.t <= t) val = s.ehb; else break }
    return val
  }

  // Build per-team timeline: collect all timestamps across team members, compute team EHB gained delta
  const teamSeries = teams.map(team => {
    const members = allMembers.filter(m => m.team_id === team.id).map(m => m.rsn)
    const allTs = new Set<number>()
    for (const rsn of members) {
      for (const s of snapsByRsn[rsn.toLowerCase()] ?? []) allTs.add(s.t)
    }
    const sortedTs = [...allTs].sort((a, b) => a - b)
    const baseline = members.reduce((sum, rsn) => sum + (snapsByRsn[rsn.toLowerCase()]?.[0]?.ehb ?? 0), 0)
    const points = sortedTs.map(t => ({
      t,
      ehb: Math.max(0, members.reduce((sum, rsn) => sum + ehbAt(rsn, t), 0) - baseline),
    }))
    return { team: { id: team.id, name: team.name, color: team.color }, points }
  })

  // Per-player series: EHB gained (delta from first snapshot)
  const playerSeries = allMembers.map(m => {
    const team = teams.find(t => t.id === m.team_id)
    const snaps = snapsByRsn[m.rsn.toLowerCase()] ?? []
    const baseline = snaps[0]?.ehb ?? 0
    const points = snaps.map(s => ({ t: s.t, ehb: Math.max(0, s.ehb - baseline) }))
    return { rsn: m.rsn, teamId: m.team_id, color: team?.color ?? '#c89b3c', points }
  })

  return NextResponse.json({ teams: teamSeries, players: playerSeries })
}
