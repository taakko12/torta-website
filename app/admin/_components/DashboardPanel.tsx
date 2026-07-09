'use client'
import type { DashboardStats } from '../_lib/data'

const SOURCE_COLORS: Record<string, string> = {
  bot:    'bg-[#7c5ce8]/20 text-[#b0a0ff]',
  web:    'bg-[#5865F2]/20 text-[#9da8fa]',
  button: 'bg-[#c89b3c]/20 text-[#e8be5a]',
  modal:  'bg-[#57F287]/20 text-[#57F287]',
  system: 'bg-[#7878a8]/20 text-[#9898c0]',
  msg:    'bg-[#ED4245]/20 text-[#f87b7e]',
}

export default function DashboardPanel({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: 'Total Members', value: stats.memberCount, sub: `+${stats.newThisWeek} this week`, color: 'text-[#57F287]' },
    { label: 'On Break', value: stats.absenceCount, sub: 'active absences', color: 'text-[#c89b3c]' },
    { label: 'Blacklisted', value: stats.blacklistCount, sub: 'removed members', color: 'text-[#ED4245]' },
    {
      label: 'Next Event',
      value: stats.nextEvent?.title ?? '—',
      sub: stats.nextEvent ? new Date(stats.nextEvent.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'none scheduled',
      color: 'text-[#9da8fa]',
      wide: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl border border-[#333358] bg-[#161628] p-5 ${c.wide ? 'col-span-2 lg:col-span-1' : ''}`}>
            <p className="text-xs text-[#7878a8] mb-1">{c.label}</p>
            <p className={`text-2xl font-bold truncate ${c.color}`}>{c.value}</p>
            <p className="text-xs text-[#5a5a7a] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358]">
          <span className="text-sm font-semibold text-[#e8e8f0]">Recent Activity</span>
        </div>
        <ul className="divide-y divide-[#1c1c36]">
          {stats.recentLogs.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-[#7878a8]">No recent activity.</li>
          )}
          {stats.recentLogs.map(log => {
            const src = log.source ?? 'bot'
            const badgeCls = SOURCE_COLORS[src] ?? SOURCE_COLORS.bot
            return (
              <li key={log.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${badgeCls}`}>{src}</span>
                <span className="text-sm text-[#e8e8f0] font-medium">{log.command}{log.subcommand ? ` · ${log.subcommand}` : ''}</span>
                {log.display_name && <span className="text-xs text-[#7878a8]">{log.display_name}</span>}
                {log.details && <span className="text-xs text-[#5a5a7a] truncate flex-1">{log.details}</span>}
                <span className="text-xs text-[#5a5a7a] ml-auto shrink-0">
                  {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
