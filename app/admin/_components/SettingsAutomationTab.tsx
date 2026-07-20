'use client'
import { useState, useEffect } from 'react'
import type { Channel, Role, GuildConfig } from '../_lib/data'

function JobToggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-200 ${enabled ? 'bg-[#57F287] border-[#57F287]' : 'bg-[#2a2a4a] border-[#333358]'}`}>
      <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

const RECAP_SECTIONS = [
  { key: 'discordChatters', label: '💬 Discord Chatters' },
  { key: 'ingameChatters',  label: '⚔️ In-Game Chatters' },
  { key: 'vcTime',          label: '🔊 VC Time' },
  { key: 'topDrops',        label: '💰 Top Drops' },
  { key: 'deaths',          label: '💀 Deaths' },
] as const
type RecapSectionKey = typeof RECAP_SECTIONS[number]['key']

type DayHourJob  = { day: number; hour: number; enabled: boolean }
type DomHourJob  = { dayOfMonth: number; hour: number; enabled: boolean }
type WeeklyRecapJob = DayHourJob & { sections: Record<RecapSectionKey, boolean> }
type SchedJobs = {
  weeklyRecap:      WeeklyRecapJob
  modRecap:         DayHourJob
  pollRoll:         DayHourJob
  monthlyReset:     DomHourJob
  womSync:          { intervalHours: number; enabled: boolean }
  vcFlush:          { intervalMinutes: number; enabled: boolean }
  compWinnerCheck:  { intervalMinutes: number; enabled: boolean }
}
const SCHED_DEFAULTS: SchedJobs = {
  weeklyRecap:     { day: 0, hour: 20, enabled: true, sections: { discordChatters: true, ingameChatters: true, vcTime: true, topDrops: true, deaths: true } },
  modRecap:        { day: 1, hour: 9,  enabled: true },
  pollRoll:        { day: 6, hour: 12, enabled: true },
  monthlyReset:    { dayOfMonth: 1, hour: 0, enabled: true },
  womSync:         { intervalHours: 1, enabled: true },
  vcFlush:         { intervalMinutes: 5, enabled: true },
  compWinnerCheck: { intervalMinutes: 30, enabled: true },
}
type SchedKey = keyof SchedJobs

const FEATURES = [
  { key: 'feedback_enabled',          label: 'Feedback Form',          desc: 'Allow anyone to submit anonymous feedback at /feedback' },
  { key: 'clanchat_tracking_enabled', label: 'In-Game Chat Tracking',  desc: 'Relay TrackScape clan chat to Discord and log activity' },
  { key: 'vc_tracking_enabled',       label: 'Voice Channel Tracking', desc: 'Track time members spend in voice channels' },
] as const

type Props = { config: GuildConfig; channels: Channel[]; roles: Role[]; saveConfig: (patch: Partial<GuildConfig>) => void }

export default function SettingsAutomationTab({ config, channels, roles, saveConfig }: Props) {
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

  async function toggleRecapSection(section: RecapSectionKey) {
    const nextJob = { ...schedJobs.weeklyRecap, sections: { ...schedJobs.weeklyRecap.sections, [section]: !schedJobs.weeklyRecap.sections[section] } }
    setSchedJobs(j => ({ ...j, weeklyRecap: nextJob }))
    await fetch('/api/admin/scheduled-jobs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'weeklyRecap', ...nextJob }),
    })
  }

  const card = 'rounded-xl border border-[#333358] bg-[#161628] overflow-hidden'
  const inp2 = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1.5 text-xs outline-none focus:border-[#7c5ce8]/60'
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  return (
    <div className="space-y-6">
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
                {key === 'weeklyRecap' && (
                  <div className="flex items-center gap-2 ml-8 mt-2 flex-wrap">
                    <span className="text-xs text-[#9898c0]">Sections:</span>
                    {RECAP_SECTIONS.map(({ key: sk, label }) => {
                      const active = schedJobs.weeklyRecap.sections[sk] !== false
                      return (
                        <button key={sk} onClick={() => toggleRecapSection(sk)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-[#7c5ce8]/20 border-[#7c5ce8]/40 text-[#b0a0ff]' : 'border-[#333358] text-[#5a5a7a] hover:text-[#9898c0]'}`}>
                          {active ? label : `${label} (off)`}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Monthly reset — day-of-month + hour */}
          {(() => {
            const job = schedJobs.monthlyReset
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
            { key: 'compWinnerCheck' as const, icon: '🏆', name: 'BOTW/SOTW Winner Check', desc: 'Detects ended competitions and posts a winner approval request.', intervalKey: 'intervalMinutes' as const, label: 'min', opts: [15,30,60,120] },
          ]).map(({ key, icon, name, desc, intervalKey, label, opts }) => {
            const job = schedJobs[key] as unknown as Record<string, number> & { enabled: boolean }
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

      {/* Features */}
      <div className={card}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Features</h2>
          <p className="text-xs text-[#7878a8] mt-1">Toggle features on or off. Changes take effect within 60 seconds.</p>
        </div>
        <div className="px-5 divide-y divide-[#1c1c36]">
          {FEATURES.map(({ key, label, desc }) => (
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
    </div>
  )
}
