'use client'
import { useState } from 'react'
import type { Drop } from '../_lib/data'

function gpFormat(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export default function LootPanel({ drops }: { drops: Drop[] }) {
  const [search, setSearch] = useState('')
  const [minGp, setMinGp] = useState('')

  const filtered = drops.filter(d => {
    const min = parseInt(minGp) || 0
    if (d.gp_value < min) return false
    if (!search) return true
    return d.player_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.item_name ?? '').toLowerCase().includes(search.toLowerCase())
  })

  const totalGp = filtered.reduce((s, d) => s + d.gp_value, 0)

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player or item…"
          className="rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] w-56" />
        <input value={minGp} onChange={e => setMinGp(e.target.value)} placeholder="Min GP (e.g. 1000000)"
          className="rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none placeholder:text-[#424268] w-44" />
        <span className="text-xs text-[#7878a8]">{filtered.length} drops · {gpFormat(totalGp)} gp total</span>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333358] text-xs text-[#7878a8]">
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-right">GP Value</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c36]">
              {filtered.slice(0, 150).map(d => (
                <tr key={d.id} className="hover:bg-[#1c1c36] transition-colors">
                  <td className="px-4 py-2 font-medium text-[#e8e8f0]">{d.player_name}</td>
                  <td className="px-4 py-2 text-[#9898c0]">{d.item_name ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono text-[#c89b3c]">{gpFormat(d.gp_value)}</td>
                  <td className="px-4 py-2 text-[#5a5a7a] whitespace-nowrap">
                    {new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-2">
                    {(d.image_url || d.screenshot_url) ? (
                      <a href={d.screenshot_url ?? d.image_url!} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#5865F2] hover:text-[#9da8fa] transition-colors">view</a>
                    ) : <span className="text-xs text-[#424268]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 150 && (
            <p className="px-4 py-3 text-xs text-[#7878a8] border-t border-[#333358]">Showing 150 of {filtered.length}. Use search/filter to narrow results.</p>
          )}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[#7878a8]">No drops match your filters.</p>
          )}
        </div>
      </div>
    </div>
  )
}
