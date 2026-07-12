'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; label: string }

const PRIMARY: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/feed', label: 'Feed' },
  { href: '/events', label: 'Events' },
]

const COMPETE: NavItem[] = [
  { href: '/hiscores', label: 'Hiscores' },
  { href: '/player', label: 'Players' },
  { href: '/cotm', label: 'COTM' },
  { href: '/bingo', label: 'Bingo' },
]

const COMMUNITY: NavItem[] = [
  { href: '/apply', label: 'Apply' },
  { href: '/submit-drop', label: 'Submit Drop' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/rules', label: 'Rules' },
  { href: '/changelog', label: 'Changelog' },
]

const linkCls = 'text-sm font-medium text-[#8080b0] hover:text-[#e8e8f0] transition-colors'

function DropdownMenu({ label, items, active }: { label: string; items: NavItem[]; active: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const hasActive = items.some(i => pathname.startsWith(i.href))

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 ${
          hasActive ? 'text-[#c89b3c]' : 'text-[#8080b0] hover:text-[#e8e8f0]'
        }`}
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50">
          <div className="rounded-xl border border-[#1e1e38] bg-[#0f0f1e]/95 backdrop-blur-md shadow-xl shadow-black/40 py-1 min-w-[140px]">
            {items.map(({ href, label: itemLabel }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors hover:bg-white/5 ${
                  pathname.startsWith(href) && href !== '/'
                    ? 'text-[#c89b3c] font-medium'
                    : 'text-[#8080b0] hover:text-[#e8e8f0]'
                }`}
              >
                {itemLabel}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const allLinks = [...PRIMARY, ...COMPETE, ...COMMUNITY]

  return (
    <>
      {/* Desktop nav */}
      <ul className="hidden lg:flex items-center gap-1">
        {PRIMARY.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={`block px-3 py-1.5 rounded-lg ${linkCls} hover:bg-white/5 ${
                (href === '/' ? pathname === '/' : pathname.startsWith(href)) ? 'text-[#c89b3c]' : ''
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
        <li><DropdownMenu label="Compete" items={COMPETE} active={COMPETE.some(i => pathname.startsWith(i.href))} /></li>
        <li><DropdownMenu label="Community" items={COMMUNITY} active={COMMUNITY.some(i => pathname.startsWith(i.href))} /></li>
      </ul>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-2 text-[#8080b0] hover:text-[#e8e8f0] transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[#0f0f1e]/95 backdrop-blur-md border-b border-[#1c1c36] py-2 px-4">
          <ul className="flex flex-col">
            {allLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 text-sm font-medium transition-colors rounded-lg hover:bg-white/5 ${
                    (href === '/' ? pathname === '/' : pathname.startsWith(href))
                      ? 'text-[#c89b3c]'
                      : 'text-[#8080b0] hover:text-[#e8e8f0]'
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li className="mt-2 pt-2 border-t border-[#1c1c36]">
                <Link href="/admin" onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-[#c89b3c] hover:text-[#d4a940] transition-colors">
                  Admin Panel
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  )
}
