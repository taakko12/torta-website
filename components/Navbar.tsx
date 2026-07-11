import Link from 'next/link'
import { getServerSession } from '@/lib/auth'
import { SignOutButton } from './AuthButton'
import NavLinks from './NavLinks'

export default async function Navbar() {
  const session = await getServerSession()

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-[#0f0f1e]/80 backdrop-blur-md relative">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-gradient-gold text-lg font-black tracking-widest uppercase hover:opacity-90 transition-opacity select-none shrink-0">
            Torta
          </Link>

          <NavLinks isAdmin={!!session?.isAdmin} />

          {/* Auth — always visible */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {session?.isAdmin && (
              <Link href="/admin"
                className="text-xs px-3 py-1.5 rounded-lg border border-[#424268] bg-[#12122a] text-[#c89b3c] hover:border-[#c89b3c]/60 hover:bg-[#c89b3c]/8 transition-all font-medium">
                Admin Panel
              </Link>
            )}
            {session ? <SignOutButton /> : (
              <a href="/api/auth/signin/discord"
                className="text-xs px-3 py-1.5 rounded-lg bg-[#5865F2] text-white font-semibold hover:bg-[#4752c4] transition-colors shadow-lg shadow-[#5865F2]/20">
                Staff Login
              </a>
            )}
          </div>
        </nav>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-[#7c5ce8]/40 to-transparent" />
    </header>
  )
}
