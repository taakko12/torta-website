'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerSearchPage() {
  const [rsn, setRsn] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = rsn.trim()
    if (trimmed) router.push(`/player/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-bold text-[#c89b3c] uppercase tracking-widest mb-2 text-center">
        Player Lookup
      </h1>
      <p className="text-sm text-[#7070a0] text-center mb-8">Search by in-game username</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={rsn}
          onChange={e => setRsn(e.target.value)}
          placeholder="Enter RSN…"
          className="flex-1 rounded-lg bg-[#141427] border border-[#2a2a4a] px-4 py-2.5 text-[#e8e8f0] placeholder-[#7070a0] focus:outline-none focus:border-[#c89b3c]"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-[#c89b3c] text-[#07070f] font-semibold text-sm hover:bg-[#d4a94a] transition-colors"
        >
          Search
        </button>
      </form>
    </div>
  )
}
