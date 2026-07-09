'use client'
import type { Recruitment } from '../_lib/data'

export default function RecruitmentsPanel({ recruitments }: { recruitments: Recruitment[] }) {
  const byRecruiter = recruitments.reduce<Record<string, number>>((acc, r) => {
    const key = r.recruiter_rsn ?? '(unknown)'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const topRecruiters = Object.entries(byRecruiter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {topRecruiters.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#7878a8] mb-3">Top Recruiters</h2>
          <div className="flex flex-wrap gap-2">
            {topRecruiters.map(([rsn, count], i) => (
              <div key={rsn} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#161628] border border-[#333358]">
                <span className="text-xs text-[#7878a8]">#{i + 1}</span>
                <span className="text-sm font-medium text-[#e8e8f0]">{rsn}</span>
                <span className="text-xs font-bold text-[#c89b3c]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#7878a8]">All Recruitments</h2>
          <span className="text-xs text-[#7878a8]">{recruitments.length} total</span>
        </div>
        <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21213c]">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Date</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Recruiter</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">New Member</th>
                </tr>
              </thead>
              <tbody>
                {recruitments.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-[#7878a8]">No recruitments logged yet.</td></tr>
                ) : recruitments.map(r => (
                  <tr key={r.id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                    <td className="px-4 py-2 text-xs text-[#7878a8] whitespace-nowrap">
                      {new Date(r.recruited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="block text-[10px]">{new Date(r.recruited_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-[#c89b3c]">{r.recruiter_rsn ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="text-sm text-[#e8e8f0]">{r.recruit_rsn}</span>
                      <span className="text-xs text-[#7878a8] block">{r.recruit_discord_id}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
