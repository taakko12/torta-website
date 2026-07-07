'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/activity',  label: 'Activity' },
  { href: '/admin/members',   label: 'Members' },
  { href: '/admin/events',    label: 'Events' },
  { href: '/admin/guides',    label: 'Guides' },
  { href: '/admin/messenger', label: 'Messenger' },
  { href: '/admin/logs',      label: 'Logs' },
  { href: '/admin/settings',  label: 'Settings' },
  { href: '/admin/bingo',     label: 'Bingo' },
]

export default function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="w-40 shrink-0">
      <ul className="flex flex-col gap-0.5">
        {NAV.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-[#c89b3c]/12 text-[#c89b3c] font-medium'
                  : 'text-[#7070a0] hover:text-[#e8e8f0] hover:bg-[#1c1c36]'
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
