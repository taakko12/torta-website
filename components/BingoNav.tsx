'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/bingo', label: 'Dashboard', icon: '📊' },
  { href: '/bingo/board', label: 'Board', icon: '🎯' },
  { href: '/bingo/leaderboards', label: 'Leaderboards', icon: '🏆' },
  { href: '/bingo/rules', label: 'Rules', icon: '📖' },
  { href: '/bingo/teams', label: 'Teams', icon: '🛡️' },
  { href: '/bingo/submissions', label: 'Submissions', icon: '📋' },
  { href: '/bingo/signup', label: 'Sign Up', icon: '✍️' },
]

export default function BingoNav({ eventTitle, isAdmin }: { eventTitle: string | null; isAdmin: boolean }) {
  const path = usePathname()
  const active = (href: string) => href === '/bingo' ? path === '/bingo' : path.startsWith(href)

  return (
    <>
      {/* Mobile: horizontal tabs */}
      <nav className="md:hidden flex overflow-x-auto gap-1 p-2 border-b border-[#1a1a30] bg-[#07070f]/80 sticky top-[57px] z-40 scrollbar-none">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              active(href)
                ? 'bg-[#7c5ce8]/20 text-[#c89b3c]'
                : 'text-[#6868a0] hover:text-[#e8e8f0] hover:bg-white/5'
            }`}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/bingo/submit"
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#c89b3c] text-[#07070f] whitespace-nowrap ml-2"
        >
          Submit Drop
        </Link>
      </nav>

      {/* Desktop: sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col sticky top-[57px] h-[calc(100vh-57px)] border-r border-[#1a1a30] bg-[#07070f]/60 backdrop-blur-sm overflow-y-auto">
        {/* Event header */}
        <div className="p-4 border-b border-[#1a1a30]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a4a70] mb-1.5">Active Event</p>
          <p className="text-sm font-semibold text-[#e8e8f0] leading-snug">
            {eventTitle ?? <span className="text-[#4a4a70] italic font-normal">None</span>}
          </p>
          {eventTitle && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#57f287] animate-pulse" />
              <span className="text-[10px] font-bold text-[#57f287] uppercase tracking-wider">Live</span>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2 pt-3">
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active(href)
                      ? 'bg-[#7c5ce8]/15 text-[#c89b3c] font-semibold'
                      : 'text-[#6868a0] hover:text-[#e8e8f0] hover:bg-white/5'
                  }`}
                >
                  <span className="text-base leading-none w-5 text-center">{icon}</span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-[#1a1a30] space-y-2">
          {isAdmin && (
            <Link
              href="/bingo/admin"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-[#3a3a60] text-[#c89b3c] text-xs font-semibold hover:bg-[#c89b3c]/10 transition-colors"
            >
              ⚙ Manage Board
            </Link>
          )}
          <Link
            href="/bingo/submit"
            className="flex items-center justify-center w-full py-2.5 rounded-lg bg-[#c89b3c] text-[#07070f] text-sm font-bold hover:bg-[#f0c060] transition-colors"
          >
            Submit Drop
          </Link>
        </div>
      </aside>
    </>
  )
}
