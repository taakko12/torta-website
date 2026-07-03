import { NextResponse } from 'next/server'
import { getActiveEvent, getEventTasks, getEventTeams, getTeamMembers, getApprovedSubmissions } from '@/lib/bingo'

export const dynamic = 'force-dynamic'

export async function GET() {
  const event = await getActiveEvent()
  if (!event) return NextResponse.json({ event: null })

  const [tasks, teams, submissions] = await Promise.all([
    getEventTasks(event.id),
    getEventTeams(event.id),
    getApprovedSubmissions(event.id),
  ])
  const members = await getTeamMembers(teams.map(t => t.id))

  return NextResponse.json({ event, tasks, teams, members, submissions })
}
