'use client'
import { useState } from 'react'
import type { ChangelogEntry, Channel } from '../_lib/data'

type Props = { initialEntries: ChangelogEntry[]; channels: Channel[]; changelogChannelId: string | null }

const CATEGORIES = ['Bot Update', 'Website', 'Rules', 'Announcement', 'Event']

const CATEGORY_COLORS: Record<string, string> = {
  'Bot Update':   'bg-[#7c5ce8]/20 text-[#b0a0ff]',
  'Website':      'bg-[#5865F2]/20 text-[#9da8fa]',
  'Rules':        'bg-[#ED4245]/20 text-[#f87b7e]',
  'Announcement': 'bg-[#c89b3c]/20 text-[#e8be5a]',
  'Event':        'bg-[#57F287]/20 text-[#57F287]',
}

function Badge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? 'bg-[#333358] text-[#9898c0]'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{category}</span>
}

type ImportCommit = { sha: string; title: string; category: string; repo: string; date: string }

export default function ChangelogPanel({ initialEntries, channels, changelogChannelId }: Props) {
  const [entries, setEntries] = useState(initialEntries)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [postChannel, setPostChannel] = useState(changelogChannelId ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importCommits, setImportCommits] = useState<ImportCommit[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  async function loadCommits() {
    setImportLoading(true); setImportError(null); setImportStatus(null)
    setSelected(new Set())
    try {
      const res = await fetch('/api/admin/changelog/import')
      const data = await res.json()
      if (!res.ok) { setImportError(data.error ?? 'Failed'); return }
      setImportCommits(data.commits)
    } catch { setImportError('Network error') }
    setImportLoading(false)
  }

  function toggleImport() {
    if (!importOpen) { setImportOpen(true); loadCommits() }
    else setImportOpen(false)
  }

  function toggleSelect(sha: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(sha) ? next.delete(sha) : next.add(sha)
      return next
    })
  }

  async function importSelected() {
    const toImport = importCommits.filter(c => selected.has(c.sha))
    if (!toImport.length) return
    setImporting(true); setImportStatus(null)
    let created = 0
    for (const c of toImport) {
      const res = await fetch('/api/admin/changelog', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: c.title,
          content: `[${c.repo}] ${c.sha}`,
          category: c.category,
          channelId: postChannel || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setEntries(prev => [data.entry, ...prev])
        created++
      }
    }
    setSelected(new Set())
    setImportStatus(`✅ Imported ${created} entr${created === 1 ? 'y' : 'ies'}`)
    setImporting(false)
  }

  async function publish() {
    if (!title.trim()) return
    setSaving(true); setStatus(null)
    try {
      const res = await fetch('/api/admin/changelog', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, channelId: postChannel || null }),
      })
      const data = await res.json()
      if (res.ok) {
        setEntries(prev => [data.entry, ...prev])
        setTitle(''); setContent('')
        setStatus(postChannel ? '✅ Published and posted to Discord' : '✅ Published')
      } else {
        setStatus(`❌ ${data.error}`)
      }
    } catch { setStatus('❌ Network error') }
    setSaving(false)
  }

  async function remove(id: number) {
    setDeleting(id)
    await fetch('/api/admin/changelog', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      {/* Import from GitHub */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden max-w-2xl">
        <button onClick={toggleImport}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-[#e8e8f0] hover:bg-[#1c1c36] transition-colors">
          <span>Import from GitHub commits</span>
          <span className="text-[#7878a8] text-xs">{importOpen ? '▲' : '▼'}</span>
        </button>

        {importOpen && (
          <div className="border-t border-[#333358]">
            {importLoading && <p className="px-5 py-6 text-sm text-center text-[#7878a8]">Loading commits…</p>}
            {importError && <p className="px-5 py-4 text-sm text-[#ED4245]">{importError}</p>}
            {!importLoading && !importError && importCommits.length === 0 && (
              <p className="px-5 py-6 text-sm text-center text-[#7878a8]">No feat/fix commits found.</p>
            )}
            {importCommits.length > 0 && (
              <>
                <p className="px-5 pt-3 pb-1 text-xs text-[#7878a8]">
                  Showing recent <code className="text-[#9898c0]">feat:</code> / <code className="text-[#9898c0]">fix:</code> commits. Select to import.
                </p>
                <ul className="divide-y divide-[#1c1c36] max-h-72 overflow-y-auto">
                  {importCommits.map(c => (
                    <li key={c.sha}
                      onClick={() => toggleSelect(c.sha)}
                      className={`flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors ${selected.has(c.sha) ? 'bg-[#7c5ce8]/10' : 'hover:bg-[#1c1c36]'}`}>
                      <input type="checkbox" readOnly checked={selected.has(c.sha)}
                        className="mt-0.5 accent-[#7c5ce8] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-[#e8e8f0] truncate">{c.title}</span>
                          <Badge category={c.category} />
                          <span className="text-xs text-[#5a5a7a] font-mono">{c.sha}</span>
                        </div>
                        <p className="text-xs text-[#5a5a7a] mt-0.5">
                          {c.repo} · {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-3 px-5 py-3 border-t border-[#333358]">
                  <span className="text-xs text-[#7878a8]">{selected.size} selected</span>
                  <button onClick={importSelected} disabled={importing || selected.size === 0}
                    className="px-3 py-1.5 rounded-lg bg-[#7c5ce8] text-white text-xs font-semibold hover:bg-[#6b4fd4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {importing ? 'Importing…' : 'Import Selected'}
                  </button>
                  {importStatus && <span className="text-xs text-[#a0a0c0]">{importStatus}</span>}
                  {postChannel && <span className="text-xs text-[#57F287]">will also post to Discord</span>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Manual create form */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] p-5 space-y-4 max-w-2xl">
        <h2 className="text-sm font-semibold text-[#e8e8f0]">New Entry</h2>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Added bulk DM feature"
            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268]" />
        </div>
        <div>
          <label className="text-xs text-[#9898c0] mb-1 block">Details (optional)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder="More detail…"
            className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] resize-none" />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-[#9898c0] mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-[#9898c0] mb-1 block">Post to Discord channel (optional)</label>
            <select value={postChannel} onChange={e => setPostChannel(e.target.value)}
              className="w-full rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none">
              <option value="">— don't post —</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={publish} disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6b4fd4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Publishing…' : 'Publish'}
          </button>
          {status && <span className="text-sm text-[#a0a0c0]">{status}</span>}
        </div>
      </div>

      {/* Entries list */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358]">
          <span className="text-sm font-semibold text-[#e8e8f0]">All Entries</span>
          <span className="ml-2 text-xs text-[#7878a8]">{entries.length} total</span>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-[#1c1c36]">
            {entries.map(e => (
              <li key={e.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-[#e8e8f0]">{e.title}</span>
                    <Badge category={e.category} />
                    {e.discord_message_id && <span className="text-xs text-[#57F287]">posted</span>}
                  </div>
                  {e.content && <p className="text-xs text-[#7878a8] line-clamp-2">{e.content}</p>}
                  <p className="text-xs text-[#5a5a7a] mt-1">
                    {new Date(e.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {e.created_by_name && ` · ${e.created_by_name}`}
                  </p>
                </div>
                <button onClick={() => remove(e.id)} disabled={deleting === e.id}
                  className="text-xs text-[#7878a8] hover:text-[#ED4245] transition-colors disabled:opacity-40 shrink-0 mt-0.5">
                  {deleting === e.id ? '…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
