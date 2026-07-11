'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Home' },
  { href: '/feed', label: 'Feed' },
  { href: '/events', label: 'Events' },
  { href: '/cotm', label: 'COTM' },
  { href: '/apply', label: 'Apply' },
  { href: '/submit-drop', label: 'Submit Drop' },
  { href: '/player', label: 'Players' },
  { href: '/hiscores', label: 'Hiscores' },
  { href: '/bingo', label: 'Bingo' },
  { href: '/rules', label: 'Rules' },
  { href: '/changelog', label: 'Changelog' },
]

const linkCls = 'text-sm font-medium text-[#8080b0] hover:text-[#e8e8f0] transition-colors rounded-lg hover:bg-white/5'

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Desktop nav */}
      <ul className="hidden lg:flex items-center gap-1">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className={`px-3 py-1.5 block ${linkCls}`}>{label}</Link>
          </li>
        ))}
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
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 ${linkCls} ${pathname === href ? 'text-[#c89b3c]' : ''}`}
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
