'use client'

import { useState, useEffect } from 'react'
import { getActiveEvent, getEventTasks } from '@/lib/bingo'

type Task = { id: string; title: string; description: string | null; required_count: number; points: number }

export default function SubmitPage() {
  const [eventId, setEventId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rsn, setRsn] = useState('')
  const [taskId, setTaskId] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    fetch('/api/bingo/active-event')
      .then(r => r.json())
      .then(({ event, tasks: t }) => {
        setEventId(event?.id ?? null)
        setTasks(t ?? [])
        if (t?.length) setTaskId(t[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!rsn.trim()) return setError('RSN is required.')
    if (!taskId) return setError('Select a task.')
    if (!file && !url.trim()) return setError('Add a screenshot or image URL.')
    setSubmitting(true)

    const form = new FormData()
    form.append('rsn', rsn.trim())
    form.append('task_id', taskId)
    form.append('event_id', eventId!)
    form.append('notes', notes)
    if (file) form.append('file', file)
    else form.append('url', url.trim())

    const res = await fetch('/api/bingo/submit', { method: 'POST', body: form })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) return setError(json.error ?? 'Submission failed.')
    setDone(true)
  }

  if (loading) {
    return <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-[#9898c0]">Loading…</div>
  }

  if (!eventId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-[#c89b3c] font-bold text-lg uppercase tracking-widest mb-2">No Active Bingo</p>
        <p className="text-sm text-[#9898c0]">There's no active bingo event to submit for.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-[#c89b3c] font-bold text-xl mb-2">✓ Submitted!</p>
        <p className="text-sm text-[#9898c0] mb-6">Your drop has been sent for admin review.</p>
        <button onClick={() => { setDone(false); setRsn(''); setNotes(''); setFile(null); setUrl('') }}
          className="text-sm text-[#a0a0c0] underline">Submit another</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-bold text-[#c89b3c] uppercase tracking-widest mb-6">Submit Drop</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#9898c0] uppercase tracking-widest mb-1.5">RSN</label>
          <input
            value={rsn} onChange={e => setRsn(e.target.value)}
            placeholder="Your in-game name"
            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9898c0] uppercase tracking-widest mb-1.5">Task</label>
          <select
            value={taskId} onChange={e => setTaskId(e.target.value)}
            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c] transition-colors"
          >
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.points}pt{t.points !== 1 ? 's' : ''}, ×{t.required_count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9898c0] uppercase tracking-widest mb-1.5">Screenshot</label>
          <input
            type="file" accept="image/*"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setUrl('') }}
            className="w-full text-sm text-[#a0a0c0] file:mr-3 file:rounded file:border-0 file:bg-[#333358] file:px-3 file:py-1.5 file:text-xs file:text-[#e8e8f0] file:cursor-pointer"
          />
          <p className="text-xs text-[#9898c0] mt-1.5">or paste an image URL (Imgur, Gyazo, etc.)</p>
          <input
            value={url} onChange={e => { setUrl(e.target.value); setFile(null) }}
            placeholder="https://i.imgur.com/..."
            disabled={!!file}
            className="w-full mt-1.5 rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c] transition-colors disabled:opacity-40"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9898c0] uppercase tracking-widest mb-1.5">Notes <span className="normal-case font-normal">(optional)</span></label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any context for the admin…"
            rows={2}
            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#c89b3c] transition-colors resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-[#c89b3c] text-[#0f0f1e] text-sm font-semibold hover:bg-[#f0c060] transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Drop'}
        </button>
      </form>
    </div>
  )
}
