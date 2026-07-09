'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { CommandLog } from '../_lib/data'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

const SOURCE_LABELS: Record<string, string> = {
  bot: 'bot', web: 'web', button: 'button', modal: 'modal', message: 'msg', system: 'system',
}
const SOURCE_COLORS: Record<string, string> = {
  bot: 'bg-[#c89b3c]/15 text-[#c89b3c]',
  web: 'bg-[#5865F2]/20 text-[#7c8cf8]',
  button: 'bg-[#57F287]/15 text-[#57F287]',
  modal: 'bg-[#57F287]/15 text-[#57F287]',
  message: 'bg-[#57F287]/15 text-[#57F287]',
  system: 'bg-[#7878a8]/20 text-[#9898c0]',
}

const FILTERS = ['all', 'bot', 'web', 'button', 'modal', 'message', 'system'] as const
type Filter = typeof FILTERS[number]

export default function LogsPanel({ initialLogs }: { initialLogs: CommandLog[] }) {
  const [logs, setLogs] = useState<CommandLog[]>(initialLogs)
  const [live, setLive] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    const ch = supabase.channel('admin_logs_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'command_logs', filter: `guild_id=eq.${GUILD_ID}` },
        payload => setLogs(prev => [payload.new as CommandLog, ...prev].slice(0, 200))
      )
      .subscribe(status => setLive(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch); setLive(false) }
  }, [])

  const visible = filter === 'all' ? logs : logs.filter(l => (l.source ?? 'bot') === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide transition-colors ${filter === f ? 'bg-[#333358] text-[#e8e8f0]' : 'text-[#7878a8] hover:text-[#9898c0]'}`}>
              {f}
            </button>
          ))}
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${live ? 'text-[#57F287]' : 'text-[#9898c0]'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-[#57F287] animate-pulse' : 'bg-[#7878a8]'}`} />
          {live ? 'Live' : 'Connecting…'}
        </span>
      </div>
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21213c]">
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Time</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Member</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Action</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Details</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#7878a8]">No entries.</td></tr>
              ) : visible.map(log => (
                <tr key={log.id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                  <td className="px-4 py-2 text-xs text-[#7878a8] whitespace-nowrap">
                    {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    <span className="block text-[10px]">{new Date(log.logged_at).toLocaleDateString()}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-[#e8e8f0]">{log.display_name ?? '—'}</span>
                    <span className="text-xs text-[#7878a8] block">{log.discord_id}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide ${SOURCE_COLORS[log.source ?? 'bot'] ?? SOURCE_COLORS.bot}`}>
                        {SOURCE_LABELS[log.source ?? 'bot'] ?? log.source}
                      </span>
                      <span className="text-sm font-mono text-[#e8e8f0]">
                        {log.source === 'web' ? log.command : `/${log.command}`}
                      </span>
                    </div>
                    {log.subcommand && <span className="text-xs text-[#9898c0] block mt-0.5">{log.subcommand}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-[#9898c0] max-w-[200px] truncate">{log.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
