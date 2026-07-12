'use client'
import { useState } from 'react'

const CATEGORIES = ['Events', 'Discord', 'Bot', 'Website', 'Other'] as const

export default function FeedbackPage() {
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !message.trim()) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, message: message.trim() }),
    })
    setLoading(false)
    if (res.ok) {
      setDone(true)
    } else {
      setError('Something went wrong. Please try again.')
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-xl font-bold text-[#e8e8f0] mb-2">Feedback received</h1>
        <p className="text-sm text-[#7878a8]">Thanks for helping us improve. Your feedback has been sent to the staff team.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e8e8f0] mb-1">Submit Feedback</h1>
        <p className="text-sm text-[#7878a8]">Anonymous — no account required. Staff review all submissions.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#7878a8] mb-2">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            className="w-full rounded-xl bg-[#161628] border border-[#2a2a4a] text-[#e8e8f0] px-4 py-3 text-sm outline-none focus:border-[#7c5ce8]/60 transition-colors appearance-none"
          >
            <option value="" disabled>Select a category…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#7878a8] mb-2">Feedback</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={5}
            maxLength={2000}
            placeholder="Share your thoughts, suggestions, or concerns…"
            className="w-full rounded-xl bg-[#161628] border border-[#2a2a4a] text-[#e8e8f0] px-4 py-3 text-sm outline-none focus:border-[#7c5ce8]/60 transition-colors resize-none placeholder:text-[#3a3a5a]"
          />
          <p className="text-xs text-[#424268] text-right mt-1">{message.length}/2000</p>
        </div>

        {error && <p className="text-sm text-[#ED4245]">{error}</p>}

        <button
          type="submit"
          disabled={loading || !category || !message.trim()}
          className="w-full py-3 rounded-xl bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4dd4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  )
}
