'use client'
import { useState, useRef, useEffect } from 'react'
import type { Channel, Role } from '../_lib/data'

type Announcement = { id: number; channel_id: string; message: string; scheduled_at: string; sent_at: string | null; created_by: string | null; created_at: string }

type Props = { channels: Channel[]; roles: Role[]; dropsChannelId: string | null }

export default function MessengerPanel({ channels, roles, dropsChannelId }: Props) {
  const [tab, setTab] = useState<'embed' | 'bulk' | 'scheduled'>('embed')

  // Embed state
  const [embedChannel, setEmbedChannel] = useState(channels[0]?.id ?? '')
  const [embedTitle, setEmbedTitle] = useState('')
  const [embedDesc, setEmbedDesc] = useState('')
  const [embedColor, setEmbedColor] = useState('#7c5ce8')
  const [embedSending, setEmbedSending] = useState(false)
  const [embedStatus, setEmbedStatus] = useState<string | null>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  // Bulk DM state
  const [bulkRole, setBulkRole] = useState(roles[0]?.id ?? '')
  const [bulkMsg, setBulkMsg] = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string | null>(null)

  // Scheduled announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [schedChannel, setSchedChannel] = useState(channels[0]?.id ?? '')
  const [schedMsg, setSchedMsg] = useState('')
  const [schedAt, setSchedAt] = useState('')
  const [schedTime, setSchedTime] = useState('20:00')
  const [schedStatus, setSchedStatus] = useState<string | null>(null)

  useEffect(() => {
    if (tab !== 'scheduled') return
    fetch('/api/admin/announcements').then(r => r.json()).then(setAnnouncements)
  }, [tab])

  async function createAnnouncement() {
    if (!schedChannel || !schedMsg.trim() || !schedAt) return
    const res = await fetch('/api/admin/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: schedChannel, message: schedMsg.trim(), scheduled_at: `${schedAt}T${schedTime}:00` }),
    })
    if (res.ok) {
      const data = await res.json()
      setAnnouncements(a => [...a, data].sort((x, y) => x.scheduled_at.localeCompare(y.scheduled_at)))
      setSchedMsg(''); setSchedAt(''); setSchedStatus('✅ Scheduled!')
    } else {
      const { error } = await res.json(); setSchedStatus(`❌ ${error}`)
    }
  }

  async function deleteAnnouncement(id: number) {
    await fetch('/api/admin/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setAnnouncements(a => a.filter(x => x.id !== id))
  }

  function wrapText(before: string, after = before) {
    const el = descRef.current; if (!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const next = embedDesc.substring(0, start) + before + embedDesc.substring(start, end) + after + embedDesc.substring(end)
    setEmbedDesc(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length) }, 0)
  }

  function prefixLine(prefix: string) {
    const el = descRef.current; if (!el) return
    const start = el.selectionStart
    const lineStart = embedDesc.lastIndexOf('\n', start - 1) + 1
    const next = embedDesc.substring(0, lineStart) + prefix + embedDesc.substring(lineStart)
    setEmbedDesc(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length) }, 0)
  }

  async function sendEmbed() {
    if (!embedChannel) return
    setEmbedSending(true); setEmbedStatus(null)
    try {
      const res = await fetch('/api/admin/send-embed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: embedChannel, title: embedTitle, description: embedDesc, color: embedColor }),
      })
      const data = await res.json()
      setEmbedStatus(res.ok ? '✅ Sent!' : `❌ ${data.error}`)
      if (res.ok) { setEmbedTitle(''); setEmbedDesc('') }
    } catch { setEmbedStatus('❌ Network error') }
    setEmbedSending(false)
  }

  async function sendBulkDm() {
    if (!bulkRole || !bulkMsg.trim()) return
    setBulkSending(true); setBulkStatus(null)
    try {
      const res = await fetch('/api/admin/bulk-dm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: bulkRole, message: bulkMsg }),
      })
      const data = await res.json()
      setBulkStatus(res.ok ? `✅ Sent to ${data.sent}/${data.total} members${data.failed ? ` (${data.failed} failed — DMs may be closed)` : ''}` : `❌ ${data.error}`)
      if (res.ok) setBulkMsg('')
    } catch { setBulkStatus('❌ Network error') }
    setBulkSending(false)
  }

  const tabCls = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-[#c89b3c] text-[#c89b3c]' : 'border-transparent text-[#7878a8] hover:text-[#e8e8f0]'}`

  return (
    <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
      <div className="flex border-b border-[#333358]">
        <button className={tabCls('embed')} onClick={() => setTab('embed')}>Channel Embed</button>
        <button className={tabCls('bulk')} onClick={() => setTab('bulk')}>Bulk DM</button>
        <button className={tabCls('scheduled')} onClick={() => setTab('scheduled')}>Scheduled</button>
      </div>

      {tab === 'embed' && (
        <div className="p-5 space-y-3 max-w-lg">
          <div>
            <label className="text-xs text-[#9898c0] mb-1 block">Channel</label>
            <select value={embedChannel} onChange={e => setEmbedChannel(e.target.value)}
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#9898c0] mb-1 block">Title</label>
            <input value={embedTitle} onChange={e => setEmbedTitle(e.target.value)} placeholder="Embed title"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
          </div>
          <div>
            <label className="text-xs text-[#9898c0] mb-1 block">Description</label>
            <div className="rounded-lg border border-[#333358] bg-[#1c1c36] overflow-hidden">
              <div className="flex flex-wrap gap-px p-1 border-b border-[#333358] bg-[#161628]">
                {[['H1', '# '], ['H2', '## '], ['H3', '### ']].map(([label, prefix]) => (
                  <button key={label} type="button" onMouseDown={e => { e.preventDefault(); prefixLine(prefix as string) }}
                    className="px-2.5 py-1 rounded text-xs font-bold text-[#a0a0c0] hover:text-[#e8e8f0] hover:bg-[#333358] transition-colors">{label}</button>
                ))}
                <span className="self-center text-[#333358] mx-1">|</span>
                {([['B','**','**','font-bold'],['I','*','*','italic'],['U','__','__','underline'],['S','~~','~~','line-through'],['`','`','`','font-mono']] as [string,string,string,string][]).map(([label,before,after,cls]) => (
                  <button key={label} type="button" onMouseDown={e => { e.preventDefault(); wrapText(before, after) }}
                    className="px-2.5 py-1 rounded text-xs text-[#a0a0c0] hover:text-[#e8e8f0] hover:bg-[#333358] transition-colors"><span className={cls}>{label}</span></button>
                ))}
                <span className="ml-auto text-[10px] text-[#424268] self-center pr-1">markdown</span>
              </div>
              <textarea ref={descRef} value={embedDesc} onChange={e => setEmbedDesc(e.target.value)}
                placeholder="Embed description…" rows={5}
                className="w-full bg-transparent text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] resize-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#9898c0] mb-1 block">Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={embedColor} onChange={e => setEmbedColor(e.target.value)}
                className="h-9 w-12 rounded cursor-pointer bg-transparent border border-[#333358]" />
              <span className="text-xs text-[#7878a8]">{embedColor}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={sendEmbed} disabled={embedSending || !embedChannel || (!embedTitle && !embedDesc)}
              className="px-4 py-2 rounded-lg bg-[#5865F2] text-white text-sm font-semibold hover:bg-[#4752c4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {embedSending ? 'Sending…' : 'Send Embed'}
            </button>
            {embedStatus && <span className="text-sm text-[#a0a0c0]">{embedStatus}</span>}
          </div>
        </div>
      )}

      {tab === 'bulk' && (
        <div className="p-5 space-y-3 max-w-lg">
          <p className="text-xs text-[#7878a8]">Send a plain-text DM to every member with the selected role. Members with DMs closed will be skipped.</p>
          <div>
            <label className="text-xs text-[#9898c0] mb-1 block">Role</label>
            <select value={bulkRole} onChange={e => setBulkRole(e.target.value)}
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#9898c0] mb-1 block">Message</label>
            <textarea value={bulkMsg} onChange={e => setBulkMsg(e.target.value)} rows={5} placeholder="Message to send…"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] resize-none" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={sendBulkDm} disabled={bulkSending || !bulkRole || !bulkMsg.trim()}
              className="px-4 py-2 rounded-lg bg-[#ED4245] text-white text-sm font-semibold hover:bg-[#c03537] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {bulkSending ? 'Sending…' : 'Send DMs'}
            </button>
            {bulkStatus && <span className="text-sm text-[#a0a0c0]">{bulkStatus}</span>}
          </div>
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="p-5 space-y-5">
          <div className="space-y-3 max-w-lg">
            <p className="text-xs text-[#7878a8]">Queue a plain-text message to be sent to a channel at a future time. The bot checks every 60 seconds.</p>
            <div className="flex gap-2 flex-wrap">
              <select value={schedChannel} onChange={e => setSchedChannel(e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
                {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </select>
              <input type="date" value={schedAt} onChange={e => setSchedAt(e.target.value)}
                className="[color-scheme:dark] rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none" />
              <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                className="[color-scheme:dark] rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none" />
            </div>
            <textarea value={schedMsg} onChange={e => setSchedMsg(e.target.value)} rows={3} placeholder="Message to send…"
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] resize-none" />
            <div className="flex items-center gap-3">
              <button onClick={createAnnouncement} disabled={!schedChannel || !schedMsg.trim() || !schedAt}
                className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">
                Schedule
              </button>
              {schedStatus && <span className="text-sm text-[#a0a0c0]">{schedStatus}</span>}
            </div>
          </div>

          {announcements.length > 0 && (
            <div className="border border-[#333358] rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-[#333358] text-xs font-semibold uppercase tracking-widest text-[#7878a8]">Queued</div>
              <ul className="divide-y divide-[#1c1c36]">
                {announcements.map(a => {
                  const ch = channels.find(c => c.id === a.channel_id)
                  const isSent = !!a.sent_at
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-[#7c8cf8]">#{ch?.name ?? a.channel_id}</span>
                          <span className="text-xs text-[#7878a8]">{new Date(a.scheduled_at).toLocaleString()}</span>
                          {isSent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#57F287]/15 text-[#57F287]">SENT</span>}
                        </div>
                        <p className="text-sm text-[#9898c0] truncate">{a.message}</p>
                      </div>
                      {!isSent && (
                        <button onClick={() => deleteAnnouncement(a.id)} className="text-xs text-[#7878a8] hover:text-[#ED4245] shrink-0">✕</button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
