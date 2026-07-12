import { getServerSession, isAdmin } from '@/lib/auth'
import AdminNav from './_components/AdminNav'
import { fetchOpenTicketCount, fetchPendingApplicationCount } from './_lib/data'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-[#c89b3c] font-bold text-xl uppercase tracking-widest mb-4">Staff Panel</p>
        <p className="text-sm text-[#9898c0] mb-6">Sign in with Discord to continue.</p>
        <a href="/api/auth/signin/discord" className="inline-block px-5 py-2.5 rounded-lg bg-[#5865F2] text-white text-sm font-semibold hover:bg-[#4752c4] transition-colors">
          Sign in with Discord
        </a>
      </div>
    )
  }

  const admin = await isAdmin(session.discordId!)
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-red-400 font-bold text-lg mb-2">Access Denied</p>
        <p className="text-sm text-[#9898c0]">You don't have the required role to access the staff panel.</p>
      </div>
    )
  }

  const [openTickets, pendingApplications] = await Promise.all([fetchOpenTicketCount(), fetchPendingApplicationCount()])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#444468] mb-0.5">Torta</p>
          <h1 className="text-lg font-bold text-[#c89b3c] uppercase tracking-widest leading-none">Staff Panel</h1>
        </div>
        {session.user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111122] border border-[#1e1e38]">
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
            )}
            <span className="text-xs text-[#9898c0]">{session.user.name}</span>
          </div>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* Sticky sidebar */}
        <div className="sticky top-4 self-start">
          <AdminNav openTickets={openTickets} pendingApplications={pendingApplications} />
        </div>
        <div className="flex-1 min-w-0 space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
