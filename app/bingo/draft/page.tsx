import { getActiveEvent, getEventTeams, getTeamMembers } from '@/lib/bingo'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import DraftBoard from './DraftBoard'

export const revalidate = 0

type Signup = { id: string; rsn: string; discord_username: string | null; expected_playtime: string | null; preferred_partner: string | null; notes: string | null; submitted_at: string }

export default async function DraftPage() {
  const [event, session] = await Promise.all([getActiveEvent(), getServerSession()])
  const isAdminUser = session?.discordId ? await isAdmin(session.discordId) : false

  if (!event) {
    return (
      <div className="px-6 py-16 max-w-2xl mx-auto text-center">
        <p className="text-5xl mb-5">📋</p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-3">Draft Board</h1>
        <p className="text-[#9898c0] text-sm">No active bingo event right now.</p>
      </div>
    )
  }

  const teams = await getEventTeams(event.id)
  const members = await getTeamMembers(teams.map(t => t.id))

  let signups: Signup[] = []
  if (isAdminUser) {
    const { data } = await getSupabaseAdmin()
      .from('bingo_signups').select('*')
      .eq('event_id', event.id).order('submitted_at', { ascending: true })
    signups = data ?? []
  }

  return (
    <DraftBoard
      event={{ id: event.id, title: event.title, team_size: (event as { team_size?: number }).team_size ?? 2 }}
      initialTeams={teams}
      initialMembers={members}
      signups={signups}
      isAdmin={isAdminUser}
    />
  )
}
