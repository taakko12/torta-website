import { fetchPublicMembers } from '@/app/admin/_lib/data'

export const revalidate = 300

export const metadata = {
  title: 'Members — Torta',
  description: 'Browse all verified members of the Torta OSRS clan.',
}

export default async function MembersPage() {
  const members = await fetchPublicMembers()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Clan</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Members</h1>
        <p className="text-sm text-[#7878a8] mt-2">{members.length} verified members</p>
      </div>

      <MemberRoster members={members} />
    </div>
  )
}

function MemberRoster({ members }: { members: Awaited<ReturnType<typeof fetchPublicMembers>> }) {
  return (
    <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#333358] text-xs text-[#7878a8]">
              <th className="px-4 py-3 text-left">RSN</th>
              <th className="px-4 py-3 text-left">Discord</th>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1c36]">
            {members.map(m => (
              <tr key={m.rsn} className="hover:bg-[#1c1c36] transition-colors">
                <td className="px-4 py-2.5 font-semibold text-[#e8e8f0]">{m.rsn}</td>
                <td className="px-4 py-2.5 text-[#9898c0]">{m.display_name ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {m.role_name
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-[#c89b3c]/15 text-[#c89b3c] font-medium">{m.role_name}</span>
                    : <span className="text-[#424268]">—</span>}
                </td>
                <td className="px-4 py-2.5 text-[#5a5a7a] whitespace-nowrap">
                  {new Date(m.linked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
