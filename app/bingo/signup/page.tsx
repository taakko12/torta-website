'use client'
import { useState, useEffect } from 'react'

const PLAYTIMES = [
  'Casual (1–5 hrs/week)',
  'Regular (5–15 hrs/week)',
  'Hardcore (15+ hrs/week)',
  'Unsure',
]

export default function SignUpPage() {
  const [eventTitle, setEventTitle] = useState<string | null>(null)
  const [eventOpen, setEventOpen] = useState(false)
  const [rsn, setRsn] = useState('')
  const [discord, setDiscord] = useState('')
  const [playtime, setPlaytime] = useState('')
  const [partner, setPartner] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    fetch('/api/bingo/active-event')
      .then(r => r.json())
      .then(({ event }) => {
        if (event) { setEventTitle(event.title); setEventOpen(true) }
      })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rsn.trim()) return
    setStatus('submitting')
    const res = await fetch('/api/bingo/signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsn: rsn.trim(), discord_username: discord.trim() || null, expected_playtime: playtime || null, preferred_partner: partner.trim() || null, notes: notes.trim() || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setStatus('done')
    } else {
      setStatus('error')
      setErrMsg(data.error ?? 'Something went wrong')
    }
  }

  const inp = 'w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60 placeholder:text-[#4a4a6a]'

  if (!eventOpen) {
    return (
      <div className="px-6 py-16 max-w-2xl mx-auto text-center">
        <p className="text-5xl mb-5">🎲</p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-3">Bingo Sign-Ups</h1>
        <p className="text-[#9898c0] text-sm">No bingo event is currently open for sign-ups. Check back when one is active!</p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="px-6 py-16 max-w-2xl mx-auto text-center">
        <p className="text-5xl mb-5">✅</p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-3">You&apos;re signed up!</h1>
        <p className="text-[#9898c0] text-sm">Your sign-up has been submitted for <span className="text-[#c89b3c]">{eventTitle}</span>. An admin will assign you to a team before the event starts.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-10 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Sign Up for Bingo</h1>
        <p className="text-sm text-[#9898c0]">{eventTitle}</p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-[#333358] bg-[#161628] p-6 space-y-4">
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">In-Game Name (RSN) <span className="text-[#cc5555]">*</span></label>
          <input value={rsn} onChange={e => setRsn(e.target.value)} placeholder="Your OSRS username" required className={inp} />
        </div>

        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Discord Username</label>
          <input value={discord} onChange={e => setDiscord(e.target.value)} placeholder="e.g. tortaPlayer#0001" className={inp} />
        </div>

        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Expected Playtime</label>
          <select value={playtime} onChange={e => setPlaytime(e.target.value)} className={inp}>
            <option value="">Select…</option>
            {PLAYTIMES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Preferred Partner <span className="text-[#7878a8]">(RSN, optional)</span></label>
          <input value={partner} onChange={e => setPartner(e.target.value)} placeholder="Leave blank if no preference" className={inp} />
          <p className="text-[10px] text-[#7878a8] mt-1">If you and your partner both list each other, you&apos;ll be shown as a pair on the draft board.</p>
        </div>

        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Notes <span className="text-[#7878a8]">(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Availability, skill focuses, etc." className={`${inp} resize-none`} />
        </div>

        {status === 'error' && (
          <p className="text-sm text-[#ED4245] bg-[#ED4245]/10 border border-[#ED4245]/30 rounded-lg px-3 py-2">{errMsg}</p>
        )}

        <button type="submit" disabled={!rsn.trim() || status === 'submitting'}
          className="w-full px-4 py-2.5 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">
          {status === 'submitting' ? 'Submitting…' : 'Submit Sign-Up'}
        </button>
      </form>
    </div>
  )
}
