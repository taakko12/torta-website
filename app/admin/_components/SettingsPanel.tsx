'use client'
import { useState, useEffect } from 'react'
import type { Channel, Role, GuildConfig, RolePanel } from '../_lib/data'

type Props = { config: GuildConfig; channels: Channel[]; roles: Role[] }

function JobToggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-200 ${enabled ? 'bg-[#57F287] border-[#57F287]' : 'bg-[#2a2a4a] border-[#333358]'}`}>
      <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

const CHANNEL_SETTINGS: [string, keyof GuildConfig, string][] = [
  ['TrackScape Clan Chat',        'clanchat_channel_id',              'In-game clan chat relay'],
  ['TrackScape Broadcasts',       'broadcast_channel_id',             'Drops, pets, quests, achievements'],
  ['Coffer Channel',              'coffer_channel_id',                'Coffer deposits/withdrawals (defaults to Broadcasts if not set)'],
  ['Coffer Leaderboard Channel',  'coffer_leaderboard_channel_id',    'Channel that holds the pinned coffer leaderboard embed'],
  ['Planks Channel',              'planks_channel_id',                'Death notifications (Dink)'],
  ['Drops Channel',               'drops_channel_id',                 'Loot drops (Dink)'],
  ['Loot Submit Channel',         'lootsubmit_channel_id',            'Staff review for manual submissions'],
  ['Welcome Channel',             'welcome_channel_id',               'New member welcome messages'],
  ['Welcome Mod Channel',         'welcome_mod_channel_id',           'Staff review for welcomes'],
  ['Weekly Recap Channel',        'recap_channel_id',                 'Sunday activity recap post'],
  ['Moderator Recap Channel',     'inactivity_channel_id',            'Monday moderator recap post'],
  ['Changelog Channel',           'changelog_channel_id',             'Optional: post new changelog entries here'],
]

export default function SettingsPanel({ config: initialConfig, channels, roles }: Props) {
  const [config, setConfig] = useState<GuildConfig>(initialConfig)
  const [rolePanel, setRolePanel] = useState<RolePanel>(initialConfig.role_panel_config ?? { channelId: null, messageId: null, roles: [] })
  const [welcomeStatus, setWelcomeStatus] = useState<string | null>(null)
  const [cofferStatus, setCofferStatus] = useState<string | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [scrapeRunning, setScrapeRunning] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null)
  const [panelRole, setPanelRole] = useState('')
  const [panelEmoji, setPanelEmoji] = useState('')
  const [panelLabel, setPanelLabel] = useState('')
  const [panelChannel, setPanelChannel] = useState('')

  type DayHourJob  = { day: number; hour: number; enabled: boolean }
  type DomHourJob  = { dayOfMonth: number; hour: number; enabled: boolean }
  type SchedJobs = {
    weeklyRecap:   DayHourJob
    modRecap:      DayHourJob
    pollRoll:      DayHourJob
    monthlyReset:  DomHourJob
    womSync:       { intervalHours: number; enabled: boolean }
    vcFlush:       { intervalMinutes: number; enabled: boolean }
  }
  const SCHED_DEFAULTS: SchedJobs = {
    weeklyRecap:  { day: 0, hour: 20, enabled: true },
    modRecap:     { day: 1, hour: 9,  enabled: true },
    pollRoll:     { day: 6, hour: 12, enabled: true },
    monthlyReset: { dayOfMonth: 1, hour: 0, enabled: true },
    womSync:      { intervalHours: 1, enabled: true },
    vcFlush:      { intervalMinutes: 5, enabled: true },
  }
  type SchedKey = keyof SchedJobs
  const [schedJobs, setSchedJobs] = useState<SchedJobs>(SCHED_DEFAULTS)
  const [schedSaving, setSchedSaving] = useState<SchedKey | null>(null)
  const [schedMsg, setSchedMsg] = useState<Partial<Record<SchedKey, string>>>({})
  const [recapFiltersOpen, setRecapFiltersOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/scheduled-jobs').then(r => r.json()).then((d: Partial<SchedJobs>) =>
      setSchedJobs(prev => ({ ...prev, ...d }))
    )
  }, [])

  async function saveSchedJob(key: SchedKey) {
    setSchedSaving(key)
    await fetch('/api/admin/scheduled-jobs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, ...schedJobs[key] }),
    })
    setSchedSaving(null)
    setSchedMsg(m => ({ ...m, [key]: '✅ Saved' }))
    setTimeout(() => setSchedMsg(m => ({ ...m, [key]: undefined })), 2000)
  }

  function patch<K extends SchedKey>(key: K, val: Partial<SchedJobs[K]>) {
    setSchedJobs(j => ({ ...j, [key]: { ...j[key], ...val } }))
  }

  async function toggleJobEnabled(key: SchedKey) {
    const nextJob = { ...schedJobs[key], enabled: !schedJobs[key].enabled }
    setSchedJobs(j => ({ ...j, [key]: nextJob }))
    await fetch('/api/admin/scheduled-jobs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, ...nextJob }),
    })
  }

  async function saveConfig(patch: Partial<GuildConfig>) {
    const updated = { ...config, ...patch }
    setConfig(updated)
    await fetch('/api/admin/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
  }

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

  async function addPanelRole() {
    if (!panelRole || !panelEmoji.trim()) return
    const label = panelLabel.trim() || roles.find(r => r.id === panelRole)?.name || panelRole
    const res = await fetch('/api/admin/rolepanel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: panelRole, emoji: panelEmoji.trim(), label }),
    })
    if (res.ok) { const data = await res.json(); setRolePanel(data.panel); setPanelRole(''); setPanelEmoji(''); setPanelLabel('') }
  }

  async function removePanelRole(roleId: string) {
    const res = await fetch('/api/admin/rolepanel', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    })
    if (res.ok) { const data = await res.json(); setRolePanel(data.panel) }
  }

  async function postRolePanel() {
    if (!panelChannel) return
    const res = await fetch('/api/admin/rolepanel', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: panelChannel }),
    })
    if (res.ok) { const data = await res.json(); setRolePanel(data.panel) }
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

  const sel = 'flex-1 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'
  const card = 'rounded-xl border border-[#333358] bg-[#161628] overflow-hidden'

  return (
    <div className="space-y-6">
      {/* Channel Settings */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Bot Channel Settings</h2>
          <p className="text-xs text-[#7878a8] mt-1">
            Changes save immediately on selection.{channels.length > 0 ? ` ${channels.length} channels loaded.` : ' No channels loaded — check bot token in Railway.'}
          </p>
        </div>
        <div className="px-5">
          {CHANNEL_SETTINGS.map(([label, key, hint]) => (
            <div key={key} className="flex items-center gap-4 py-3 border-b border-[#1c1c36] last:border-0">
              <div className="w-52 shrink-0">
                <div className="text-sm text-[#c0c0e0]">{label}</div>
                <div className="text-xs text-[#7878a8] mt-0.5">{hint}</div>
              </div>
              <select value={(config[key] as string | null | undefined) ?? ''} onChange={e => saveConfig({ [key]: e.target.value || null })} className={sel}>
                <option value="">— Not set —</option>
                {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Role Settings */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Role Settings</h2>
          <p className="text-xs text-[#7878a8] mt-1">{roles.length > 0 ? `${roles.length} roles loaded.` : <span className="text-[#ED4245]">No roles loaded.</span>}</p>
        </div>
        <div className="px-5">
          <div className="flex items-center gap-4 py-3">
            <div className="w-52 shrink-0">
              <div className="text-sm text-[#c0c0e0]">Welcome Role</div>
              <div className="text-xs text-[#7878a8] mt-0.5">Granted when a new member agrees to rules</div>
            </div>
            <select value={config.welcome_role_id ?? ''} onChange={e => saveConfig({ welcome_role_id: e.target.value || null })} className={sel}>
              <option value="">— Not set —</option>
              {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>

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

      {/* Role Panel */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Role Panel</h2>
          <p className="text-xs text-[#7878a8] mt-1">Manage role self-assignment buttons. Adding or removing a role auto-updates the Discord message.</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          {rolePanel.roles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rolePanel.roles.map(r => (
                <div key={r.roleId} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#1c1c36] border border-[#333358] text-sm text-[#c0c0e0]">
                  <span>{r.emoji}</span><span>{r.label}</span>
                  <button onClick={() => removePanelRole(r.roleId)} className="text-[#7878a8] hover:text-[#ED4245] transition-colors ml-1 leading-none">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <select value={panelRole} onChange={e => setPanelRole(e.target.value)} className={sel}>
              <option value="">Select role…</option>
              {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
            </select>
            <input value={panelEmoji} onChange={e => setPanelEmoji(e.target.value)} placeholder="Emoji"
              className="w-20 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
            <input value={panelLabel} onChange={e => setPanelLabel(e.target.value)} placeholder="Label (optional)"
              className="flex-1 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60" />
            <button onClick={addPanelRole} disabled={!panelRole || !panelEmoji.trim()}
              className="px-3 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] disabled:opacity-40">Add</button>
          </div>
          <div className="flex gap-2 pt-1 border-t border-[#1c1c36]">
            <select value={panelChannel} onChange={e => setPanelChannel(e.target.value)} className={sel}>
              <option value="">Select channel to post to…</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
            <button onClick={postRolePanel} disabled={!panelChannel}
              className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] disabled:opacity-40">
              {rolePanel.messageId ? 'Repost Panel' : 'Post Panel'}
            </button>
          </div>
          {rolePanel.channelId && (
            <p className="text-xs text-[#7878a8]">Currently posted in #{channels.find(c => c.id === rolePanel.channelId)?.name ?? rolePanel.channelId}</p>
          )}
        </div>
      </div>

      {/* Scheduled Jobs */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Scheduled Jobs</h2>
          <p className="text-xs text-[#9898c0] mt-1">All bot automation. Changes take effect on the next check cycle. Times are UTC.</p>
        </div>
        <div className="px-5 divide-y divide-[#1c1c36]">
          {/* Day + Hour jobs */}
          {([
            { key: 'weeklyRecap' as const, icon: '📊', name: 'Weekly Activity Recap', desc: 'Top chatters, VC time, top drops.', channelKey: 'recap_channel_id' as keyof GuildConfig },
            { key: 'modRecap'    as const, icon: '📋', name: 'Moderator Recap',        desc: 'Inactive members and unlinked accounts.', channelKey: 'inactivity_channel_id' as keyof GuildConfig },
            { key: 'pollRoll'    as const, icon: '🎲', name: 'BOTW/SOTW Poll Roll',    desc: 'Posts weekly competition polls.', channelKey: 'poll_channel_id' as keyof GuildConfig },
          ]).map(({ key, icon, name, desc, channelKey }) => {
            const ch = channels.find(c => c.id === (config[channelKey] as string | null | undefined))
            const job = schedJobs[key] as { day: number; hour: number; enabled: boolean }
            const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
            const inp2 = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1.5 text-xs outline-none focus:border-[#7c5ce8]/60'
            return (
              <div key={key} className={`py-4 ${!job.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl mt-0.5 shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#e8e8f0]">{name}</div>
                    <div className="text-xs text-[#9898c0] mt-0.5">{desc}</div>
                  </div>
                  {ch
                    ? <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-[#7c5ce8]/10 text-[#b09cf8] border border-[#7c5ce8]/20">#{ch.name}</span>
                    : <span className="shrink-0 text-xs text-[#9898c0]">Channel not set</span>}
                  <JobToggle enabled={job.enabled} onClick={() => toggleJobEnabled(key)} />
                </div>
                <div className="flex items-center gap-2 ml-8 flex-wrap">
                  <span className="text-xs text-[#9898c0]">Every</span>
                  <select value={job.day} onChange={e => patch(key, { day: +e.target.value } as Partial<typeof job>)} className={inp2}>
                    {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <span className="text-xs text-[#9898c0]">at</span>
                  <select value={job.hour} onChange={e => patch(key, { hour: +e.target.value } as Partial<typeof job>)} className={inp2}>
                    {Array.from({length:24},(_,h) => <option key={h} value={h}>{String(h).padStart(2,'0')}:00 UTC</option>)}
                  </select>
                  <button onClick={() => saveSchedJob(key)} disabled={schedSaving === key}
                    className="px-3 py-1.5 rounded-lg bg-[#7c5ce8] text-white text-xs font-semibold hover:bg-[#6a4fd6] disabled:opacity-40 transition-colors">
                    {schedSaving === key ? 'Saving…' : 'Save'}
                  </button>
                  {schedMsg[key] && <span className="text-xs text-[#57F287]">{schedMsg[key]}</span>}
                </div>
              </div>
            )
          })}

          {/* Monthly reset — day-of-month + hour */}
          {(() => {
            const job = schedJobs.monthlyReset
            const inp2 = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1.5 text-xs outline-none focus:border-[#7c5ce8]/60'
            return (
              <div className={`py-4 ${!job.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl mt-0.5 shrink-0">🔁</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#e8e8f0]">Monthly Activity Reset</div>
                    <div className="text-xs text-[#9898c0] mt-0.5">Zeros out monthly message and VC counts.</div>
                  </div>
                  <JobToggle enabled={job.enabled} onClick={() => toggleJobEnabled('monthlyReset')} />
                </div>
                <div className="flex items-center gap-2 ml-8 flex-wrap">
                  <span className="text-xs text-[#9898c0]">On the</span>
                  <select value={job.dayOfMonth} onChange={e => patch('monthlyReset', { dayOfMonth: +e.target.value })} className={inp2}>
                    {Array.from({length:28},(_,i) => <option key={i+1} value={i+1}>{i+1}{[,'st','nd','rd'][i+1]??'th'}</option>)}
                  </select>
                  <span className="text-xs text-[#9898c0]">at</span>
                  <select value={job.hour} onChange={e => patch('monthlyReset', { hour: +e.target.value })} className={inp2}>
                    {Array.from({length:24},(_,h) => <option key={h} value={h}>{String(h).padStart(2,'0')}:00 UTC</option>)}
                  </select>
                  <button onClick={() => saveSchedJob('monthlyReset')} disabled={schedSaving === 'monthlyReset'}
                    className="px-3 py-1.5 rounded-lg bg-[#7c5ce8] text-white text-xs font-semibold hover:bg-[#6a4fd6] disabled:opacity-40 transition-colors">
                    {schedSaving === 'monthlyReset' ? 'Saving…' : 'Save'}
                  </button>
                  {schedMsg.monthlyReset && <span className="text-xs text-[#57F287]">{schedMsg.monthlyReset}</span>}
                </div>
              </div>
            )
          })()}

          {/* Recap Filters — collapsible */}
          <div className="py-3">
            <button onClick={() => setRecapFiltersOpen(o => !o)}
              className="flex items-center gap-2 w-full text-left group">
              <span className="text-sm font-medium text-[#c0c0e0] group-hover:text-[#e8e8f0] transition-colors">⚙️ Recap Filters</span>
              <span className="text-xs text-[#5a5a7a] flex-1">excluded roles, validation</span>
              <span className="text-[#5a5a7a] text-xs">{recapFiltersOpen ? '▲' : '▼'}</span>
            </button>
            {recapFiltersOpen && (
              <div className="mt-4 ml-7 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#9898c0] mb-1">Exclude from inactive list</p>
                  <p className="text-[10px] text-[#5a5a7a] mb-2">Members with these roles won't appear in the Monday moderator recap inactive section. Add Staff, Owner, etc.</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map(r => {
                      const active = (config.recap_excluded_roles ?? []).includes(r.name)
                      return (
                        <button key={r.id}
                          onClick={() => {
                            const cur = config.recap_excluded_roles ?? []
                            saveConfig({ recap_excluded_roles: active ? cur.filter(n => n !== r.name) : [...cur, r.name] })
                          }}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-[#ED4245]/15 border-[#ED4245]/50 text-[#ff8080]' : 'border-[#333358] text-[#7878a8] hover:text-[#e8e8f0]'}`}>
                          @{r.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-[#5a5a7a]">
                  The recap also automatically skips anyone no longer in the Discord server or (for in-game RSNs) no longer in the WOM group.
                </p>
              </div>
            )}
          </div>

          {/* Interval jobs */}
          {([
            { key: 'womSync' as const, icon: '🔄', name: 'WOM Group Sync',  desc: 'Syncs member RSNs with Wise Old Man.', intervalKey: 'intervalHours' as const,   label: 'hours',   opts: [1,2,4,6,12,24] },
            { key: 'vcFlush' as const, icon: '🎙️', name: 'VC Session Flush', desc: 'Commits active voice session time to DB.', intervalKey: 'intervalMinutes' as const, label: 'min', opts: [1,5,10,15,30] },
          ]).map(({ key, icon, name, desc, intervalKey, label, opts }) => {
            const job = schedJobs[key] as unknown as Record<string, number> & { enabled: boolean }
            const inp2 = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1.5 text-xs outline-none focus:border-[#7c5ce8]/60'
            return (
              <div key={key} className={`py-4 ${!job.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl mt-0.5 shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#e8e8f0]">{name}</div>
                    <div className="text-xs text-[#9898c0] mt-0.5">{desc}</div>
                  </div>
                  <JobToggle enabled={job.enabled} onClick={() => toggleJobEnabled(key)} />
                </div>
                <div className="flex items-center gap-2 ml-8 flex-wrap">
                  <span className="text-xs text-[#9898c0]">Every</span>
                  <select value={job[intervalKey]} onChange={e => patch(key, { [intervalKey]: +e.target.value } as Partial<SchedJobs[typeof key]>)} className={inp2}>
                    {opts.map(v => <option key={v} value={v}>{v} {label}</option>)}
                  </select>
                  <button onClick={() => saveSchedJob(key)} disabled={schedSaving === key}
                    className="px-3 py-1.5 rounded-lg bg-[#7c5ce8] text-white text-xs font-semibold hover:bg-[#6a4fd6] disabled:opacity-40 transition-colors">
                    {schedSaving === key ? 'Saving…' : 'Save'}
                  </button>
                  {schedMsg[key] && <span className="text-xs text-[#57F287]">{schedMsg[key]}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Staff Display */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Staff Display</h2>
          <p className="text-xs text-[#7878a8] mt-1">Controls who appears in the Owner / Staff section on the public homepage. Updates automatically when Discord roles change.</p>
        </div>
        <div className="px-5 divide-y divide-[#1c1c36]">
          <div className="flex items-center gap-4 py-3">
            <div className="w-52 shrink-0">
              <div className="text-sm text-[#c0c0e0]">Owner Role</div>
              <div className="text-xs text-[#7878a8] mt-0.5">Single role shown as "Owner"</div>
            </div>
            <select value={config.owner_role_name ?? ''} onChange={e => saveConfig({ owner_role_name: e.target.value || null })} className={sel}>
              <option value="">— Not set —</option>
              {roles.map(r => <option key={r.id} value={r.name}>@{r.name}</option>)}
            </select>
          </div>
          <div className="py-3">
            <div className="text-sm text-[#c0c0e0] mb-1">Staff Roles</div>
            <div className="text-xs text-[#7878a8] mb-3">All members with these roles appear under "Staff"</div>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => {
                const active = (config.staff_role_names ?? []).includes(r.name)
                return (
                  <button key={r.id}
                    onClick={() => {
                      const cur = config.staff_role_names ?? []
                      saveConfig({ staff_role_names: active ? cur.filter(n => n !== r.name) : [...cur, r.name] })
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-[#7c5ce8]/20 border-[#7c5ce8]/60 text-[#b09cf8]' : 'border-[#333358] text-[#7878a8] hover:text-[#e8e8f0]'}`}>
                    @{r.name}
                  </button>
                )
              })}
            </div>
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
            {(() => {
              const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
              const inp2 = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1.5 text-xs outline-none focus:border-[#7c5ce8]/60'
              return (
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
              )
            })()}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Features</h2>
          <p className="text-xs text-[#7878a8] mt-1">Toggle features on or off. Changes take effect within 60 seconds.</p>
        </div>
        <div className="px-5 divide-y divide-[#1c1c36]">
          {([
            { key: 'feedback_enabled',          label: 'Feedback Form',             desc: 'Allow anyone to submit anonymous feedback at /feedback' },
            { key: 'clanchat_tracking_enabled',  label: 'In-Game Chat Tracking',     desc: 'Relay TrackScape clan chat to Discord and log activity' },
            { key: 'vc_tracking_enabled',        label: 'Voice Channel Tracking',    desc: 'Track time members spend in voice channels' },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[#c0c0e0]">{label}</p>
                <p className="text-xs text-[#5a5a7a]">{desc}</p>
              </div>
              <button
                onClick={() => saveConfig({ [key]: !config[key] })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ${config[key] ? 'bg-[#57F287] border-[#57F287]' : 'bg-[#2a2a4a] border-[#333358]'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${config[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
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
