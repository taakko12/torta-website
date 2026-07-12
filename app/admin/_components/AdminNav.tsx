'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; label: string; icon: string; badge?: 'tickets' | 'applications' }
type NavGroup = { label?: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/admin', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'Members',
    items: [
      { href: '/admin/tickets',      label: 'Tickets',      icon: '🎫', badge: 'tickets' },
      { href: '/admin/applications', label: 'Applications', icon: '📝', badge: 'applications' },
      { href: '/admin/members',      label: 'Members',      icon: '👥' },
      { href: '/admin/blacklist',    label: 'Blacklist',    icon: '🚫' },
      { href: '/admin/promotions',   label: 'Promotions',   icon: '⬆️' },
      { href: '/admin/recruitments', label: 'Recruitments', icon: '🎯' },
    ],
  },
  {
    label: 'Clan',
    items: [
      { href: '/admin/events', label: 'Events',       icon: '📅' },
      { href: '/admin/comp',   label: 'Competitions', icon: '🏆' },
      { href: '/admin/cotm',   label: 'COTM',         icon: '🌟' },
      { href: '/admin/bingo',  label: 'Bingo',        icon: '🎮' },
    ],
  },
  {
    label: 'Data',
    items: [
      { href: '/admin/activity', label: 'Activity', icon: '📈' },
      { href: '/admin/loot',     label: 'Loot',     icon: '💰' },
      { href: '/admin/coffer',   label: 'Coffer',   icon: '🏦' },
    ],
  },
  {
    label: 'Comms',
    items: [
      { href: '/admin/messenger', label: 'Messenger', icon: '📢' },
      { href: '/admin/changelog', label: 'Changelog', icon: '📋' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/logs',     label: 'Logs',     icon: '🔍' },
      { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
]

export default function AdminNav({ openTickets = 0, pendingApplications = 0 }: { openTickets?: number; pendingApplications?: number }) {
  const pathname = usePathname()
  const badges: Record<string, number> = { tickets: openTickets, applications: pendingApplications }

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <nav className="w-48 shrink-0">
      <div className="rounded-xl border border-[#1e1e38] bg-[#111122] p-2 space-y-0.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-2' : ''}>
            {group.label && (
              <p className="px-2 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#444468]">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon, badge }) => {
              const count = badge ? badges[badge] : 0
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-[#c89b3c]/12 text-[#c89b3c] font-medium'
                      : 'text-[#7878a8] hover:text-[#e8e8f0] hover:bg-[#1c1c36]'
                  }`}>
                  <span className="text-base leading-none w-5 shrink-0 text-center">{icon}</span>
                  <span className="flex-1 leading-none">{label}</span>
                  {count > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ED4245]/20 text-[#ED4245] leading-none tabular-nums">
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </nav>
  )
}
