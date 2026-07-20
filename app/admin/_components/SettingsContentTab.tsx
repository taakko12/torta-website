'use client'
import { useState } from 'react'
import type { Channel, GuildConfig } from '../_lib/data'

type Props = { config: GuildConfig; channels: Channel[]; saveConfig: (patch: Partial<GuildConfig>) => void }

export default function SettingsContentTab({ config, channels, saveConfig }: Props) {
  const [welcomeStatus, setWelcomeStatus] = useState<string | null>(null)
  const [cofferStatus, setCofferStatus] = useState<string | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [scrapeRunning, setScrapeRunning] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null)

  async function refreshAllEmbeds() {
    setRefreshingAll(true); setWelcomeStatus(null); setCofferStatus(null)
    const [wRes, cRes] = await Promise.all([
      config.welcome_channel_id ? fetch('/api/admin/welcome', { method: 'POST' }) : Promise.resolve(null),
      config.coffer_leaderboard_channel_id ? fetch('/api/admin/coffer', { method: 'POST' }) : Promise.resolve(null),
    ])
    if (wRes) { const d = await wRes.json(); setWelcomeStatus(wRes.ok ? '✅' : `❌ ${d.error}`) }
    if (cRes) { const d = await cRes.json(); setCofferStatus(cRes.ok ? '✅' : `❌ ${d.error}`) }
    setRefreshingAll(false)
  }

  async function scrapeHistory(period: 'month' | 'all') {
    setScrapeRunning(true); setScrapeStatus(null)
    const res = await fetch('/api/admin/scrape', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    })
    const data = await res.json()
    setScrapeRunning(false)
    setScrapeStatus(res.ok
      ? `✅ Done — ${data.inserted} drops imported, ${data.skipped} already existed (${data.total} messages scanned).`
      : `❌ ${data.error}`)
  }

  const card = 'rounded-xl border border-[#333358] bg-[#161628] overflow-hidden'
  const inp2 = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1.5 text-xs outline-none focus:border-[#7c5ce8]/60'
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  return (
    <div className="space-y-6">
      {/* Pinned Embeds */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Pinned Embeds</h2>
            <p className="text-xs text-[#7878a8] mt-1">Re-posts any pinned Discord embeds — use if a message was deleted or needs updating.</p>
          </div>
          <button onClick={refreshAllEmbeds} disabled={refreshingAll}
            className="shrink-0 px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">
            {refreshingAll ? 'Refreshing…' : '🔄 Refresh All'}
          </button>
        </div>
        <div className="px-5 divide-y divide-[#1c1c36]">
          <div className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#c0c0e0]">Welcome Panel</p>
              <p className="text-xs text-[#5a5a7a]">Rules embed with "I Agree" button</p>
            </div>
            {config.welcome_channel_id
              ? <span className="text-xs text-[#9898c0]">#{channels.find(c => c.id === config.welcome_channel_id)?.name ?? config.welcome_channel_id}</span>
              : <span className="text-xs text-[#424268]">channel not set</span>}
            {welcomeStatus && <span className="text-xs shrink-0">{welcomeStatus}</span>}
          </div>
          <div className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#c0c0e0]">Coffer Leaderboard</p>
              <p className="text-xs text-[#5a5a7a]">Auto-updates on donations; re-post if deleted</p>
            </div>
            {config.coffer_leaderboard_channel_id
              ? <span className="text-xs text-[#9898c0]">#{channels.find(c => c.id === config.coffer_leaderboard_channel_id)?.name ?? config.coffer_leaderboard_channel_id}</span>
              : <span className="text-xs text-[#424268]">channel not set</span>}
            {cofferStatus && <span className="text-xs shrink-0">{cofferStatus}</span>}
          </div>
        </div>
      </div>

      {/* Competition Schedule */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Competition Schedule</h2>
          <p className="text-xs text-[#7878a8] mt-1">Shown on the public Events page. Poll countdown uses the day/hour below — keep it in sync with your BOTW/SOTW Poll Roll schedule.</p>
        </div>
        <div className="px-5 divide-y divide-[#1c1c36]">
          {([
            ['SOTW Date Range', 'comp_sotw_days', 'e.g. "1st–7th of each month"'] as const,
            ['BOTW Date Range', 'comp_botw_days', 'e.g. "8th–14th of each month"'] as const,
          ]).map(([label, key, placeholder]) => (
            <div key={key} className="flex items-center gap-4 py-3">
              <div className="w-52 shrink-0">
                <div className="text-sm text-[#c0c0e0]">{label}</div>
                <div className="text-xs text-[#7878a8] mt-0.5">{placeholder}</div>
              </div>
              <input
                defaultValue={(config[key] as string | null | undefined) ?? ''}
                placeholder={placeholder}
                onBlur={e => saveConfig({ [key]: e.target.value || null })}
                className="flex-1 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60"
              />
            </div>
          ))}
          <div className="py-3">
            <div className="text-sm text-[#c0c0e0] mb-1">Poll Goes Live</div>
            <div className="text-xs text-[#7878a8] mb-3">When the next BOTW/SOTW vote opens — drives the countdown on the Events page</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#9898c0]">Every</span>
              <select value={config.comp_poll_day ?? 6} onChange={e => saveConfig({ comp_poll_day: +e.target.value })} className={inp2}>
                {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <span className="text-xs text-[#9898c0]">at</span>
              <select value={config.comp_poll_hour ?? 12} onChange={e => saveConfig({ comp_poll_hour: +e.target.value })} className={inp2}>
                {Array.from({length:24},(_,h) => <option key={h} value={h}>{String(h).padStart(2,'0')}:00 UTC</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loot Scrape */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Loot History Scrape</h2>
          <p className="text-xs text-[#7878a8] mt-1">Re-scan the drops channel and import any missed entries. Automatically skips duplicates.</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[#1a1020] border border-[#c89b3c]/30 text-xs text-[#c89b3c]">
            <span className="text-base mt-0.5 shrink-0">⚠️</span>
            <span>This fetches every message in the drops channel from Discord. Large channels may take several minutes. Run once for a full backfill — the bot handles new drops automatically going forward.</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => scrapeHistory('month')} disabled={scrapeRunning || !config.drops_channel_id}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#c0c0e0] text-sm hover:border-[#7c5ce8]/60 transition-colors disabled:opacity-40">
              {scrapeRunning ? 'Scraping…' : 'Scrape This Month'}
            </button>
            <button onClick={() => scrapeHistory('all')} disabled={scrapeRunning || !config.drops_channel_id}
              className="flex-1 px-4 py-2 rounded-lg bg-[#1c1c36] border border-[#ED4245]/40 text-[#c0c0e0] text-sm hover:border-[#ED4245]/80 transition-colors disabled:opacity-40">
              {scrapeRunning ? 'Scraping…' : 'Scrape All Time ⚠️'}
            </button>
          </div>
          {scrapeStatus && <p className="text-xs text-[#a0a0c0]">{scrapeStatus}</p>}
          {!config.drops_channel_id && <p className="text-xs text-[#7878a8]">Set Drops Channel above to enable scraping.</p>}
        </div>
      </div>
    </div>
  )
}
