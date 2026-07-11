'use client'
import { useState } from 'react'

export default function ApplyPage() {
  const [rsn, setRsn] = useState('')
  const [discord, setDiscord] = useState('')
  const [discordId, setDiscordId] = useState('')
  const [timezone, setTimezone] = useState('')
  const [about, setAbout] = useState('')
  const [why, setWhy] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!rsn.trim() || !about.trim() || !why.trim()) return
    setStatus('sending')
    const res = await fetch('/api/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsn, discord_username: discord, discord_user_id: discordId, timezone, about, why }),
    })
    if (res.ok) { setStatus('done') } else {
      const { error: e } = await res.json(); setError(e ?? 'Failed'); setStatus('error')
    }
  }

  const inp = 'w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60 placeholder:text-[#424268]'

  if (status === 'done') {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#57F287] mb-3">Application Submitted</h1>
        <p className="text-sm text-[#9898c0]">Thanks for applying to Torta! A staff member will review your application and reach out via Discord soon.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Join the Clan</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Apply to Torta</h1>
        <p className="text-sm text-[#9898c0] mt-2">Fill out the form below. Staff will review your application and reach out via Discord.</p>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] p-6 space-y-4">
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">OSRS RSN <span className="text-[#ED4245]">*</span></label>
          <input value={rsn} onChange={e => setRsn(e.target.value)} placeholder="Your in-game name" className={inp} />
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Discord Username</label>
          <input value={discord} onChange={e => setDiscord(e.target.value)} placeholder="e.g. username#0000 or @username" className={inp} />
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">
            Discord User ID
            <span className="ml-2 text-[#5a5a7a] normal-case font-normal">optional — lets us DM you directly</span>
          </label>
          <input value={discordId} onChange={e => setDiscordId(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 123456789012345678" className={inp} />
          <p className="text-[10px] text-[#5a5a7a] mt-1">
            Find it: Discord Settings → Advanced → enable Developer Mode, then right-click your profile and click <em>Copy User ID</em>.
          </p>
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Timezone</label>
          <input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g. EST, GMT+1, AEST" className={inp} />
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Tell us about yourself <span className="text-[#ED4245]">*</span></label>
          <textarea value={about} onChange={e => setAbout(e.target.value)} rows={4}
            placeholder="Experience, total level, what you enjoy doing in-game…"
            className={`${inp} resize-none`} />
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Why do you want to join Torta? <span className="text-[#ED4245]">*</span></label>
          <textarea value={why} onChange={e => setWhy(e.target.value)} rows={3}
            placeholder="What brought you here?"
            className={`${inp} resize-none`} />
        </div>
        {error && <p className="text-sm text-[#ED4245]">{error}</p>}
        <button
          onClick={submit}
          disabled={status === 'sending' || !rsn.trim() || !about.trim() || !why.trim()}
          className="w-full py-2.5 rounded-lg bg-[#7c5ce8] text-white text-sm font-bold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40">
          {status === 'sending' ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    </div>
  )
}
