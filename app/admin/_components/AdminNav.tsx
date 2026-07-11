'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin',                label: 'Dashboard' },
  { href: '/admin/tickets',        label: 'Tickets',      badge: 'tickets' as const },
  { href: '/admin/activity',       label: 'Activity' },
  { href: '/admin/members',        label: 'Members' },
  { href: '/admin/blacklist',      label: 'Blacklist' },
  { href: '/admin/promotions',     label: 'Promotions' },
  { href: '/admin/events',         label: 'Events' },
  { href: '/admin/applications',   label: 'Applications', badge: 'applications' as const },
  { href: '/admin/loot',           label: 'Loot' },
  { href: '/admin/comp',           label: 'Manage Competitions' },
  { href: '/admin/messenger',      label: 'Messenger' },
  { href: '/admin/recruitments',   label: 'Recruitments' },
  { href: '/admin/cotm',           label: 'COTM' },
  { href: '/admin/changelog',      label: 'Changelog' },
  { href: '/admin/logs',           label: 'Logs' },
  { href: '/admin/settings',       label: 'Settings' },
  { href: '/admin/bingo',          label: 'Bingo' },
]

export default function AdminNav({ openTickets = 0, pendingApplications = 0 }: { openTickets?: number; pendingApplications?: number }) {
  const pathname = usePathname()
  const badges: Record<string, number> = { tickets: openTickets, applications: pendingApplications }
  return (
    <nav className="w-40 shrink-0">
      <ul className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, badge }) => {
          const count = badge ? badges[badge] : 0
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))
                    ? 'bg-[#c89b3c]/12 text-[#c89b3c] font-medium'
                    : 'text-[#9898c0] hover:text-[#e8e8f0] hover:bg-[#1c1c36]'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ED4245]/20 text-[#ED4245] leading-none">{count}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
