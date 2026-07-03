import { getServerSession, isAdmin } from '@/lib/auth'
import AdminDashboard from './AdminDashboard'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await getServerSession()

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-[#c89b3c] font-bold text-xl uppercase tracking-widest mb-4">Admin Access</p>
        <p className="text-sm text-[#7070a0] mb-6">Sign in with Discord to manage the bingo board.</p>
        <a
          href="/api/auth/signin/discord"
          className="inline-block px-5 py-2.5 rounded-lg bg-[#5865F2] text-white text-sm font-semibold hover:bg-[#4752c4] transition-colors"
        >
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
        <p className="text-sm text-[#7070a0]">You don't have the required role to manage bingo.</p>
      </div>
    )
  }

  return <AdminDashboard />
}
