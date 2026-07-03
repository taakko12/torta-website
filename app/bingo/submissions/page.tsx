import {
  getActiveEvent, getEventTasks, getEventTeams,
  getTeamMembers, getRecentSubmissions,
} from '@/lib/bingo'
import { ClientDate } from '@/components/ClientDate'

export const revalidate = 15

export default async function SubmissionsPage() {
  const event = await getActiveEvent()

  if (!event) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[#6868a0] text-sm">No active event.</p>
      </div>
    )
  }

  const [tasks, teams, submissions] = await Promise.all([
    getEventTasks(event.id),
    getEventTeams(event.id),
    getRecentSubmissions(event.id, 50),
  ])

  const teamIds = teams.map(t => t.id)
  const allMembers = teamIds.length ? await getTeamMembers(teamIds) : []

  const rsnToTeam = new Map<string, typeof teams[0]>()
  for (const team of teams) {
    for (const m of allMembers.filter(m => m.team_id === team.id)) {
      rsnToTeam.set(m.rsn.toLowerCase(), team)
    }
  }
  const taskMap = new Map(tasks.map(t => [t.id, t]))

  const approved = submissions.filter(s => s.status === 'approved')
  const pending = submissions.filter(s => s.status === 'pending')
  const rejected = submissions.filter(s => s.status === 'rejected')

  const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#57f287]/15 text-[#57f287]">Approved</span>
    if (status === 'pending') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c89b3c]/15 text-[#c89b3c]">Pending</span>
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Rejected</span>
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Submissions</h1>
        <p className="text-sm text-[#6868a0]">
          {event.title} · {approved.length} approved · {pending.length} pending · {rejected.length} rejected
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] p-10 text-center">
          <p className="text-[#4a4a70] text-sm">No submissions yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] overflow-hidden">
          {submissions.map(sub => {
            const team = rsnToTeam.get(sub.rsn.toLowerCase())
            const task = taskMap.get(sub.task_id)
            return (
              <div key={sub.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#141427] last:border-0">
                <div
                  className="w-1 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: team?.color ?? '#252540' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#e8e8f0]">{sub.rsn}</span>
                    {team && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${team.color}20`, color: team.color }}
                      >
                        {team.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6868a0] truncate mt-0.5">{task?.title ?? 'Unknown task'}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {statusBadge(sub.status)}
                  <p className="text-[10px] text-[#4a4a70]">
                    <ClientDate iso={sub.submitted_at} />
                  </p>
                </div>
                {sub.screenshot_url && (
                  <a
                    href={sub.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6868a0] hover:text-[#c89b3c] transition-colors text-xs shrink-0"
                    title="View screenshot"
                  >
                    🖼
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
