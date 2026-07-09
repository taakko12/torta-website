import Link from 'next/link'
import { getServerSession } from '@/lib/auth'
import { SignOutButton } from './AuthButton'

const links = [
  { href: '/', label: 'Home' },
  { href: '/feed', label: 'Feed' },
  { href: '/events', label: 'Events' },
  { href: '/player', label: 'Players' },
  { href: '/hiscores', label: 'Hiscores' },
  { href: '/bingo', label: 'Bingo' },
  { href: '/rules', label: 'Rules' },
  { href: '/changelog', label: 'Changelog' },
]

export default async function Navbar() {
  const session = await getServerSession()

  return (
    <header className="sticky top-0 z-50">
      {/* Main bar */}
      <div className="bg-[#0f0f1e]/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="text-gradient-gold text-lg font-black tracking-widest uppercase hover:opacity-90 transition-opacity select-none">
            Torta
          </Link>

          {/* Nav links */}
          <ul className="flex items-center gap-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="relative px-3 py-1.5 text-sm font-medium text-[#8080b0] hover:text-[#e8e8f0] transition-colors rounded-lg hover:bg-white/5"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {session?.isAdmin && (
              <Link
                href="/admin"
                className="text-xs px-3 py-1.5 rounded-lg border border-[#424268] bg-[#12122a] text-[#c89b3c] hover:border-[#c89b3c]/60 hover:bg-[#c89b3c]/8 transition-all font-medium"
              >
                Admin Panel
              </Link>
            )}
            {session ? (
              <SignOutButton />
            ) : (
              <a
                href="/api/auth/signin/discord"
                className="text-xs px-3 py-1.5 rounded-lg bg-[#5865F2] text-white font-semibold hover:bg-[#4752c4] transition-colors shadow-lg shadow-[#5865F2]/20"
              >
                Staff Login
              </a>
            )}
          </div>
        </nav>
      </div>

      {/* Gradient divider line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7c5ce8]/40 to-transparent" />
    </header>
  )
}
