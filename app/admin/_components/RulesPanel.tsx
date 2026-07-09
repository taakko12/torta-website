'use client'
import { useState } from 'react'

export default function RulesPanel({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent)
  const [saved, setSaved] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const dirty = content !== saved

  async function save() {
    setSaving(true); setStatus(null)
    const res = await fetch('/api/admin/rules', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) { setSaved(content); setStatus('✅ Saved') }
    else setStatus('❌ Failed to save')
    setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#e8e8f0]">Clan Rules</span>
          <span className="text-xs text-[#7878a8]">Markdown supported · visible at /rules</span>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={20}
          placeholder={"# Clan Rules\n\n## 1. Respect\nBe respectful to all members.\n\n## 2. Activity\n..."}
          className="w-full bg-transparent text-[#e8e8f0] px-5 py-4 text-sm outline-none font-mono resize-none placeholder:text-[#424268]" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !dirty}
          className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6b4fd4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
        </button>
        {status && <span className="text-sm text-[#a0a0c0]">{status}</span>}
        {dirty && !saving && <span className="text-xs text-[#c89b3c]">Unsaved changes</span>}
      </div>
    </div>
  )
}
