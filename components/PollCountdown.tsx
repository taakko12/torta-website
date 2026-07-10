'use client'
import { useState, useEffect } from 'react'

function getNextPoll(day: number, hour: number): Date {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(hour, 0, 0, 0)
  const daysUntil = (day - now.getUTCDay() + 7) % 7
  // If today is the right day but the hour has passed, add 7 days
  next.setUTCDate(now.getUTCDate() + (daysUntil === 0 && next.getTime() <= now.getTime() ? 7 : daysUntil))
  return next
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

export default function PollCountdown({ pollDay, pollHour }: { pollDay: number; pollHour: number }) {
  const [remaining, setRemaining] = useState(() => getNextPoll(pollDay, pollHour).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => setRemaining(getNextPoll(pollDay, pollHour).getTime() - Date.now()), 60_000)
    return () => clearInterval(id)
  }, [pollDay, pollHour])

  return <span className="font-mono text-[#c89b3c]">{fmt(remaining)}</span>
}
