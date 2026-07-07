'use client'
import { useState, useRef } from 'react'
import type { Channel } from '../_lib/data'

type Props = { channels: Channel[]; dropsChannelId: string | null }

export default function MessengerPanel({ channels, dropsChannelId }: Props) {
  const [embedChannel, setEmbedChannel] = useState(channels[0]?.id ?? '')
  const [embedTitle, setEmbedTitle] = useState('')
  const [embedDesc, setEmbedDesc] = useState('')
  const [embedColor, setEmbedColor] = useState('#7c5ce8')
  const [embedSending, setEmbedSending] = useState(false)
  const [embedStatus, setEmbedStatus] = useState<string | null>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div className="rounded-xl border border-[#333358] bg-[#161628] p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-4">Send Embed to Discord</h2>
      <div className="space-y-3 max-w-lg">
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
              <span className="self-center text-[#333358] mx-1">|</span>
              {([['> ','> ',''],['- ','- ','']] as [string,string,string][]).map(([label,before,after]) => (
                <button key={label} type="button" onMouseDown={e => { e.preventDefault(); wrapText(before, after) }}
                  className="px-2.5 py-1 rounded text-xs font-mono text-[#a0a0c0] hover:text-[#e8e8f0] hover:bg-[#333358] transition-colors">{label}</button>
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
    </div>
  )
}
