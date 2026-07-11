'use client'
import { useState } from 'react'
import { formatGp } from '@/lib/utils'

function parseGp(raw: string): number {
  const s = raw.toLowerCase().trim()
  const m = s.match(/^([\d,.]+)\s*([kmb]?)$/)
  if (!m) return NaN
  const n = parseFloat(m[1].replace(/,/g, ''))
  const mult = m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : m[2] === 'b' ? 1_000_000_000 : 1
  return Math.round(n * mult)
}

export default function SubmitDropPage() {
  const [rsn, setRsn] = useState('')
  const [item, setItem] = useState('')
  const [gpRaw, setGpRaw] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const gp = parseGp(gpRaw)
  const gpPreview = !isNaN(gp) && gp > 0 ? formatGp(gp) : null

  async function submit() {
    if (!rsn.trim() || !item.trim() || isNaN(gp) || gp < 1) return
    setStatus('sending')
    let res: Response
    if (imageFile) {
      const fd = new FormData()
      fd.append('rsn', rsn.trim())
      fd.append('item_name', item.trim())
      fd.append('gp_value', String(gp))
      fd.append('notes', notes.trim())
      fd.append('image', imageFile)
      res = await fetch('/api/submit-drop', { method: 'POST', body: fd })
    } else {
      res = await fetch('/api/submit-drop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rsn, item_name: item, gp_value: gp, screenshot_url: screenshot || null, notes }),
      })
    }
    if (res.ok) { setStatus('done') } else {
      const { error: e } = await res.json(); setError(e ?? 'Failed'); setStatus('error')
    }
  }

  const inp = 'w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60 placeholder:text-[#424268]'

  if (status === 'done') {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#57F287] mb-3">Drop Submitted!</h1>
        <p className="text-sm text-[#9898c0]">A staff member will review and add it to the leaderboard.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Community</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Submit a Drop</h1>
        <p className="text-sm text-[#9898c0] mt-2">Got a notable drop? Submit it and staff will add it to the leaderboard.</p>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] p-6 space-y-4">
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">OSRS RSN <span className="text-[#ED4245]">*</span></label>
          <input value={rsn} onChange={e => setRsn(e.target.value)} placeholder="Your in-game name" className={inp} />
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Item Name <span className="text-[#ED4245]">*</span></label>
          <input value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Twisted Bow" className={inp} />
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">GP Value <span className="text-[#ED4245]">*</span></label>
          <input value={gpRaw} onChange={e => setGpRaw(e.target.value)} placeholder="e.g. 1.2b, 500m, 1500000" className={inp} />
          {gpPreview && <p className="text-xs text-[#c89b3c] mt-1">{gpPreview}</p>}
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Screenshot (optional)</label>
          <label className="flex items-center gap-2 cursor-pointer w-full rounded-lg bg-[#1c1c36] border border-[#333358] px-3 py-2 text-sm hover:border-[#7c5ce8]/60 transition-colors">
            <span className="text-[#6868a0]">📎</span>
            <span className={imageFile ? 'text-[#e8e8f0]' : 'text-[#424268]'}>
              {imageFile ? imageFile.name : 'Attach image…'}
            </span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { setImageFile(e.target.files?.[0] ?? null); setScreenshot('') }} />
          </label>
          {!imageFile && (
            <input value={screenshot} onChange={e => setScreenshot(e.target.value)}
              placeholder="or paste a URL (https://imgur.com/…)" className={`${inp} mt-2`} />
          )}
          {imageFile && (
            <button onClick={() => setImageFile(null)} className="text-xs text-[#5a5a7a] hover:text-[#ED4245] mt-1 transition-colors">
              ✕ Remove
            </button>
          )}
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context…" className={inp} />
        </div>
        {error && <p className="text-sm text-[#ED4245]">{error}</p>}
        <button
          onClick={submit}
          disabled={status === 'sending' || !rsn.trim() || !item.trim() || isNaN(gp) || gp < 1}
          className="w-full py-2.5 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-bold hover:bg-[#d4a940] transition-colors disabled:opacity-40">
          {status === 'sending' ? 'Submitting…' : 'Submit Drop'}
        </button>
      </div>
    </div>
  )
}
