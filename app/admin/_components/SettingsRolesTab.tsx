'use client'
import { useState } from 'react'
import type { Channel, Role, GuildConfig, RolePanel } from '../_lib/data'
import { CARD, FIELD } from './ui'

type Props = { config: GuildConfig; channels: Channel[]; roles: Role[]; saveConfig: (patch: Partial<GuildConfig>) => void }

export default function SettingsRolesTab({ config, channels, roles, saveConfig }: Props) {
  const [rolePanel, setRolePanel] = useState<RolePanel>(config.role_panel_config ?? { channelId: null, messageId: null, roles: [] })
  const [panelRole, setPanelRole] = useState('')
  const [panelEmoji, setPanelEmoji] = useState('')
  const [panelLabel, setPanelLabel] = useState('')
  const [panelChannel, setPanelChannel] = useState('')

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

  const sel = `flex-1 ${FIELD}`
  const card = CARD

  return (
    <div className="space-y-6">
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
    </div>
  )
}
