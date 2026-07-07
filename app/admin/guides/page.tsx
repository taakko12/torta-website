'use client'

import { useState, useEffect } from 'react'

type Guide = { id: string; title: string; created_at: string; thread_id: string | null; forum_channel_id: string | null }

export default function GuidesAdminPage() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [forumChannelId, setForumChannelId] = useState('')
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/guides')
      .then(r => r.json())
      .then(d => { setGuides(d.guides ?? []); setLoading(false) })
  }, [])

  async function importGuides() {
    if (!forumChannelId.trim()) return
    setImporting(true); setMsg('')
    const res = await fetch('/api/admin/guides', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forum_channel_id: forumChannelId.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg(`Imported ${data.imported} guide${data.imported !== 1 ? 's' : ''}. ${data.message ?? ''}`)
      // Refresh list
      fetch('/api/admin/guides').then(r => r.json()).then(d => setGuides(d.guides ?? []))
    } else {
      setMsg(`Error: ${data.error}`)
    }
    setImporting(false)
  }

  async function deleteGuide(id: string) {
    await fetch('/api/admin/guides', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setGuides(g => g.filter(x => x.id !== id))
  }

  const inp = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'
  const card = 'rounded-xl border border-[#333358] bg-[#161628]'

  return (
    <div className="space-y-6">
      {/* Import from Discord */}
      <div className={`${card} p-5`}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-1">Import from Discord Forum</h2>
        <p className="text-xs text-[#4a4a70] mb-4">
          Paste the channel ID of your Discord forum channel. Each thread becomes a guide. Re-importing updates existing ones.
        </p>
        <div className="flex gap-3 flex-wrap">
          <input
            value={forumChannelId}
            onChange={e => setForumChannelId(e.target.value)}
            placeholder="Forum channel ID (e.g. 123456789012345678)"
            className={`flex-1 min-w-[220px] ${inp}`}
          />
          <button
            onClick={importGuides}
            disabled={importing || !forumChannelId.trim()}
            className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6a4fd6] transition-colors disabled:opacity-40"
          >
            {importing ? 'Importing…' : '↓ Import Guides'}
          </button>
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.startsWith('Error') ? 'text-[#ED4245]' : 'text-[#57F287]'}`}>{msg}</p>}
        <p className="text-xs text-[#4a4a70] mt-3">
          To find the channel ID: right-click the forum channel in Discord → Copy Channel ID (requires Developer Mode).
        </p>
      </div>

      {/* Guides list */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-3 border-b border-[#333358]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">
            Published Guides <span className="text-[#4a4a70] normal-case font-normal">({guides.length})</span>
          </h2>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-[#4a4a70]">Loading…</p>
        ) : guides.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#4a4a70]">No guides yet. Import from Discord above.</p>
        ) : (
          <div className="divide-y divide-[#1c1c36]">
            {guides.map(g => (
              <div key={g.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#1c1c36]/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e8f0] truncate">{g.title}</p>
                  <p className="text-xs text-[#4a4a70]">{new Date(g.created_at).toLocaleDateString()}</p>
                </div>
                <a href={`/guides/${g.id}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#7070a0] hover:text-[#c89b3c] px-2 py-1 rounded border border-[#333358] hover:border-[#c89b3c]/40">
                  View
                </a>
                {g.thread_id && (
                  <a href={`https://discord.com/channels/${process.env.NEXT_PUBLIC_GUILD_ID}/${g.thread_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#7070a0] hover:text-[#5865F2] px-2 py-1 rounded border border-[#333358] hover:border-[#5865F2]/40">
                    Discord
                  </a>
                )}
                <button onClick={() => deleteGuide(g.id)}
                  className="text-xs text-[#4a4a70] hover:text-white px-2 py-1 rounded bg-[#ED4245]/0 hover:bg-[#ED4245] border border-[#ED4245]/30 hover:border-[#ED4245]">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
