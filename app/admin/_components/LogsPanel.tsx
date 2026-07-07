'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { CommandLog } from '../_lib/data'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export default function LogsPanel({ initialLogs }: { initialLogs: CommandLog[] }) {
  const [logs, setLogs] = useState<CommandLog[]>(initialLogs)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const ch = supabase.channel('admin_logs_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'command_logs', filter: `guild_id=eq.${GUILD_ID}` },
        payload => setLogs(prev => [payload.new as CommandLog, ...prev].slice(0, 200))
      )
      .subscribe(status => setLive(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch); setLive(false) }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#7878a8]">Last 200 entries, newest first.</span>
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
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Command</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#7878a8]">Subcommand</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#7878a8]">No commands logged yet.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-[#1c1c36] last:border-0 hover:bg-[#1c1c36]/50">
                  <td className="px-4 py-2 text-xs text-[#7878a8] whitespace-nowrap">
                    {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    <span className="block text-[10px]">{new Date(log.logged_at).toLocaleDateString()}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-[#e8e8f0]">{log.display_name ?? '—'}</span>
                    <span className="text-xs text-[#7878a8] block">{log.discord_id}</span>
                  </td>
                  <td className="px-4 py-2 text-sm font-mono text-[#c89b3c]">/{log.command}</td>
                  <td className="px-4 py-2 text-xs text-[#9898c0]">{log.subcommand ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
