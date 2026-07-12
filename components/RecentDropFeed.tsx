'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ClientDate } from '@/components/ClientDate'
import { formatGp } from '@/lib/utils'
import type { RecentDropItem } from '@/lib/data'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DROPS_CHANNEL = process.env.NEXT_PUBLIC_DROPS_CHANNEL_ID!

type ReviewState = { id: number; reason: string; submitting: boolean; done: boolean }

export function RecentDropFeed({ drops }: { drops: RecentDropItem[] }) {
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({})

  function openReview(id: number) {
    setReviews(r => ({ ...r, [id]: { id, reason: '', submitting: false, done: false } }))
  }

  function closeReview(id: number) {
    setReviews(r => { const n = { ...r }; delete n[id]; return n })
  }

  function setReason(id: number, reason: string) {
    setReviews(r => ({ ...r, [id]: { ...r[id], reason } }))
  }

  async function submitReview(drop: RecentDropItem) {
    const state = reviews[drop.id]
    if (!state?.reason.trim()) return
    setReviews(r => ({ ...r, [drop.id]: { ...r[drop.id], submitting: true } }))
    await fetch('/api/loot-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dropId: drop.id,
        label: `${drop.player_name}${drop.item_name ? ` — ${drop.item_name}` : ''} (${formatGp(drop.gp_value)})`,
        reason: state.reason.trim(),
      }),
    })
    setReviews(r => ({ ...r, [drop.id]: { ...r[drop.id], submitting: false, done: true } }))
  }

  if (drops.length === 0)
    return <div className="rounded-xl border border-[#333358] bg-[#161628] py-12 text-center text-sm text-[#9898c0]">No drops recorded yet.</div>

  return (
    <div className="space-y-2">
      {drops.map(d => {
        const rev = reviews[d.id]
        return (
          <div key={d.id} className="rounded-xl border border-[#333358] bg-[#161628] p-4">
            <div className="flex items-center gap-4">
              {d.image_url && (
                <Image src={d.image_url} alt={d.item_name ?? 'item'} width={36} height={36} className="rounded shrink-0 object-contain" unoptimized />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-[#e8e8f0] capitalize">{d.player_name}</span>
                {d.item_name && d.item_name !== 'Monthly aggregate' && (
                  <span className="text-xs text-[#9898c0] ml-2">{d.item_name}</span>
                )}
                <div className="text-xs text-[#7878a8] mt-0.5"><ClientDate iso={d.recorded_at} /></div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-semibold text-[#c89b3c]">{formatGp(d.gp_value)}</div>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  {d.discord_message_id && (
                    <a href={`https://discord.com/channels/${GUILD_ID}/${DROPS_CHANNEL}/${d.discord_message_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-[#7878a8] hover:text-[#c89b3c] transition-colors">↗ Discord</a>
                  )}
                  {!rev && (
                    <button onClick={() => openReview(d.id)}
                      className="text-[10px] text-[#5a5a7a] hover:text-[#FEE75C] transition-colors">
                      🚩 Report
                    </button>
                  )}
                </div>
              </div>
            </div>

            {rev && (
              <div className="mt-3 pt-3 border-t border-[#1c1c36]">
                {rev.done ? (
                  <p className="text-xs text-[#57F287]">✓ Review request sent to staff.</p>
                ) : (
                  <div className="flex gap-2 items-start">
                    <textarea
                      autoFocus
                      value={rev.reason}
                      onChange={e => setReason(d.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReview(d) }}
                      placeholder="Why does this drop need review?"
                      rows={2}
                      className="flex-1 rounded-lg bg-[#0f0f1e] border border-[#FEE75C]/30 text-[#e8e8f0] px-3 py-2 text-xs outline-none resize-none placeholder:text-[#3a3a5a] focus:border-[#FEE75C]/60 transition-colors"
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => submitReview(d)} disabled={rev.submitting || !rev.reason.trim()}
                        className="text-xs px-3 py-1.5 rounded bg-[#FEE75C]/20 text-[#d4b800] hover:bg-[#FEE75C]/30 disabled:opacity-40 font-medium">
                        {rev.submitting ? '…' : 'Send'}
                      </button>
                      <button onClick={() => closeReview(d.id)}
                        className="text-xs px-3 py-1.5 rounded text-[#5a5a7a] hover:text-[#e8e8f0] hover:bg-[#2a2a4a]">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
