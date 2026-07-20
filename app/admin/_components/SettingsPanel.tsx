'use client'
import { useState } from 'react'
import type { Channel, Role, GuildConfig } from '../_lib/data'
import SettingsChannelsTab from './SettingsChannelsTab'
import SettingsAutomationTab from './SettingsAutomationTab'
import SettingsRolesTab from './SettingsRolesTab'
import SettingsContentTab from './SettingsContentTab'

type Props = { config: GuildConfig; channels: Channel[]; roles: Role[] }
type Tab = 'channels' | 'automation' | 'roles' | 'content'

const TABS: { key: Tab; label: string }[] = [
  { key: 'channels',   label: 'Channels' },
  { key: 'automation', label: 'Automation' },
  { key: 'roles',      label: 'Roles & Ranks' },
  { key: 'content',    label: 'Content' },
]

export default function SettingsPanel({ config: initialConfig, channels, roles }: Props) {
  const [config, setConfig] = useState<GuildConfig>(initialConfig)
  const [tab, setTab] = useState<Tab>('channels')

  async function saveConfig(patch: Partial<GuildConfig>) {
    const updated = { ...config, ...patch }
    setConfig(updated)
    await fetch('/api/admin/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-[#c89b3c] text-[#c89b3c]' : 'border-transparent text-[#7878a8] hover:text-[#e8e8f0]'}`

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[#333358]">
        {TABS.map(t => <button key={t.key} className={tabCls(t.key)} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'channels'   && <SettingsChannelsTab config={config} channels={channels} saveConfig={saveConfig} />}
      {tab === 'automation' && <SettingsAutomationTab config={config} channels={channels} roles={roles} saveConfig={saveConfig} />}
      {tab === 'roles'      && <SettingsRolesTab config={config} channels={channels} roles={roles} saveConfig={saveConfig} />}
      {tab === 'content'    && <SettingsContentTab config={config} channels={channels} saveConfig={saveConfig} />}
    </div>
  )
}
