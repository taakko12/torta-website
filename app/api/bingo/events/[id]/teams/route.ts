import { NextResponse } from 'next/server'
import { getEventTeams, getTeamMembers } from '@/lib/bingo'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teams = await getEventTeams(id)
  const members = await getTeamMembers(teams.map(t => t.id))
  return NextResponse.json({ teams, members })
}
