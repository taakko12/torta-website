import { getServerSession, isAdmin } from '@/lib/auth'
import AdminNav from './_components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-[#c89b3c] font-bold text-xl uppercase tracking-widest mb-4">Staff Panel</p>
        <p className="text-sm text-[#7070a0] mb-6">Sign in with Discord to continue.</p>
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
        <p className="text-sm text-[#7070a0]">You don't have the required role to access the staff panel.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-bold text-[#c89b3c] uppercase tracking-widest mb-6">Staff Panel</h1>
      <div className="flex gap-6 items-start">
        <AdminNav />
        <div className="flex-1 min-w-0 space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
