'use client'
import { useState, useEffect, useCallback } from 'react'

type Team = { id: string; name: string; color: string }
type Member = { id: string; team_id: string; rsn: string }
type Signup = { id: string; rsn: string; discord_username: string | null; expected_playtime: string | null; preferred_partner: string | null; notes: string | null; submitted_at: string }
type WomData = { displayName: string; type: string; ehp: number; ehb: number; totalLevel: number }

const ACCOUNT_BADGES: Record<string, { label: string; color: string }> = {
  ironman:          { label: 'IM',   color: '#a0a0b8' },
  hardcore_ironman: { label: 'HCIM', color: '#ED4245' },
  ultimate_ironman: { label: 'UIM',  color: '#b09cf8' },
  group_ironman:    { label: 'GIM',  color: '#57F287' },
  solo_ironman:     { label: 'SIM',  color: '#c89b3c' },
}

async function adminApi(action: string, extra: object = {}) {
  const res = await fetch('/api/bingo/admin', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'API error')
}

type Props = {
  event: { id: string; title: string; team_size: number }
  initialTeams: Team[]
  initialMembers: Member[]
  signups: Signup[]
  isAdmin: boolean
}

export default function DraftBoard({ event, initialTeams, initialMembers, signups, isAdmin }: Props) {
  const [teams, setTeams] = useState(initialTeams)
  const [members, setMembers] = useState(initialMembers)
  const [womData, setWomData] = useState<Record<string, WomData>>({})
  const [womLoading, setWomLoading] = useState(false)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string[]>([])

  const refreshTeams = useCallback(async () => {
    const res = await fetch(`/api/bingo/events/${event.id}/teams`)
    const { teams: t, members: m } = await res.json()
    setTeams(t ?? [])
    setMembers(m ?? [])
  }, [event.id])

  // Auto-refresh for viewers every 20s
  useEffect(() => {
    const id = setInterval(refreshTeams, 20_000)
    return () => clearInterval(id)
  }, [refreshTeams])

  // Load WOM data on mount
  useEffect(() => {
    const allRsns = [
      ...new Set([
        ...initialMembers.map(m => m.rsn),
        ...signups.map(s => s.rsn),
      ])
    ]
    if (!allRsns.length) return
    setWomLoading(true)
    fetch(`/api/bingo/draft?rsns=${encodeURIComponent(allRsns.join(','))}`)
      .then(r => r.json())
      .then(d => { setWomData(d); setWomLoading(false) })
      .catch(() => setWomLoading(false))
  }, [initialMembers, signups])

  async function assignToTeam(teamId: string, rsns: string[]) {
    const assigned = new Set(members.map(m => m.rsn.toLowerCase()))
    const toAdd = rsns.filter(r => !assigned.has(r.toLowerCase()))
    await Promise.all(toAdd.map(rsn => adminApi('add_member', { team_id: teamId, rsn })))
    await refreshTeams()
  }

  async function removeMember(id: string) {
    await adminApi('remove_member', { id })
    setMembers(m => m.filter(x => x.id !== id))
  }

  // Duo pair detection (mutual preferred_partner)
  const confirmedPairs = new Map<string, string>()
  for (const s of signups) {
    if (!s.preferred_partner) continue
    const pLow = s.preferred_partner.toLowerCase()
    const hasMatch = signups.some(x => x.rsn.toLowerCase() === pLow && x.preferred_partner?.toLowerCase() === s.rsn.toLowerCase())
    if (hasMatch) confirmedPairs.set(s.rsn.toLowerCase(), pLow)
  }

  const assignedRsns = new Set(members.map(m => m.rsn.toLowerCase()))

  // Pool: unassigned players, duo pairs grouped
  type PoolItem = { type: 'solo'; s: Signup } | { type: 'pair'; a: Signup; b: Signup }
  const seen = new Set<string>()
  const poolItems: PoolItem[] = []
  for (const s of signups) {
    const key = s.rsn.toLowerCase()
    if (seen.has(key) || assignedRsns.has(key)) continue
    const partnerKey = confirmedPairs.get(key)
    if (partnerKey && !seen.has(partnerKey) && !assignedRsns.has(partnerKey)) {
      const b = signups.find(x => x.rsn.toLowerCase() === partnerKey)
      if (b) { poolItems.push({ type: 'pair', a: s, b }); seen.add(key); seen.add(partnerKey); continue }
    }
    poolItems.push({ type: 'solo', s })
    seen.add(key)
  }

  function PlayerCard({ rsn, dimmed = false }: { rsn: string; dimmed?: boolean }) {
    const d = womData[rsn.toLowerCase()]
    const badge = d ? ACCOUNT_BADGES[d.type] : null
    return (
      <div className={`flex flex-col gap-0.5 ${dimmed ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {badge && (
            <span className="px-1 py-px rounded text-[9px] font-bold leading-none shrink-0"
              style={{ background: badge.color + '22', color: badge.color }}>{badge.label}</span>
          )}
          <span className="text-sm font-semibold text-[#e8e8f0] capitalize leading-tight">{d?.displayName ?? rsn}</span>
        </div>
        {d && (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-[#7878a8]">Lv {d.totalLevel}</span>
            <span className="text-[#c89b3c]">{d.ehp.toFixed(0)} EHP</span>
            <span className="text-[#57F287]">{d.ehb.toFixed(0)} EHB</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-[#c89b3c]">Draft Board</h1>
          <p className="text-xs text-[#9898c0] mt-0.5">{event.title}</p>
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {womLoading && <span className="text-xs text-[#7878a8] animate-pulse">Loading WOM…</span>}
          {isAdmin && (
            <span className="text-[10px] px-2 py-1 rounded bg-[#c89b3c]/15 text-[#c89b3c] font-bold uppercase tracking-widest border border-[#c89b3c]/30">
              Admin Mode
            </span>
          )}
          <button onClick={refreshTeams}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#333358] text-[#9898c0] hover:text-[#e8e8f0] hover:border-[#4a4a6a] transition-colors">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Main layout: teams left, pool right (admin only) */}
      <div className={`grid gap-5 items-start ${isAdmin ? 'xl:grid-cols-[1fr_320px]' : ''}`}>

        {/* Teams */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8] mb-3">
            Teams — {event.team_size}-man
          </p>
          {teams.length === 0 && (
            <p className="text-sm text-[#9898c0]">No teams created yet.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
            {teams.map(team => {
              const teamMembers = members.filter(m => m.team_id === team.id)
              const slots = Array.from({ length: event.team_size }, (_, i) => teamMembers[i] ?? null)
              const isTarget = dropTarget === team.id
              const isFull = teamMembers.length >= event.team_size
              return (
                <div key={team.id}
                  onDragOver={isAdmin && !isFull ? e => { e.preventDefault(); setDropTarget(team.id) } : undefined}
                  onDragLeave={isAdmin ? () => setDropTarget(null) : undefined}
                  onDrop={isAdmin ? e => {
                    e.preventDefault(); setDropTarget(null)
                    const rsns = JSON.parse(e.dataTransfer.getData('rsns') || '[]') as string[]
                    if (rsns.length) assignToTeam(team.id, rsns)
                  } : undefined}
                  className={`rounded-2xl border p-4 transition-all duration-150 ${
                    isTarget ? 'scale-[1.02] shadow-lg' : ''
                  } ${isFull ? 'bg-[#0d1a10]' : 'bg-[#0d0d1a]'}`}
                  style={{ borderColor: isTarget ? team.color : isFull ? team.color + '60' : '#2a2a4a' }}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                      <span className="text-sm font-bold" style={{ color: team.color }}>{team.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono ${isFull ? 'text-[#57F287]' : 'text-[#7878a8]'}`}>
                      {teamMembers.length}/{event.team_size}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {slots.map((m, i) => m ? (
                      <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#161628]">
                        <PlayerCard rsn={m.rsn} />
                        {isAdmin && (
                          <button onClick={() => removeMember(m.id)}
                            className="text-[#7878a8] hover:text-[#ED4245] transition-colors text-sm shrink-0 ml-1">×</button>
                        )}
                      </div>
                    ) : (
                      <div key={i} className={`px-3 py-3 rounded-xl border border-dashed flex items-center justify-center transition-colors ${
                        isTarget ? 'border-[#7c5ce8]/60 bg-[#7c5ce8]/5' : 'border-[#2a2a4a]'
                      }`}>
                        <span className="text-[10px] text-[#3a3a5a]">{isAdmin ? 'drop here' : 'empty'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pool — admin only */}
        {isAdmin && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7878a8] mb-3">
              Signup Pool — {poolItems.length} unassigned
            </p>

            {poolItems.length === 0 && signups.length > 0 && (
              <div className="rounded-xl border border-[#57F287]/30 bg-[#0d1a10] px-4 py-6 text-center">
                <p className="text-sm text-[#57F287] font-semibold">All players assigned ✓</p>
              </div>
            )}

            {signups.length === 0 && (
              <p className="text-sm text-[#9898c0]">No sign-ups yet.</p>
            )}

            <div className="space-y-2">
              {poolItems.map((item, idx) => {
                if (item.type === 'pair') {
                  const rsns = [item.a.rsn, item.b.rsn]
                  const isDragging = dragging.some(r => rsns.includes(r))
                  return (
                    <div key={idx} draggable
                      onDragStart={e => { setDragging(rsns); e.dataTransfer.setData('rsns', JSON.stringify(rsns)) }}
                      onDragEnd={() => setDragging([])}
                      className={`rounded-xl border border-[#7c5ce8]/40 bg-[#12122a] p-3 cursor-grab active:cursor-grabbing transition-opacity select-none ${isDragging ? 'opacity-40' : ''}`}>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#b09cf8] mb-2">🔗 Duo Pair</p>
                      <div className="space-y-2.5">
                        {[item.a, item.b].map(s => (
                          <div key={s.id}>
                            <PlayerCard rsn={s.rsn} />
                            {s.discord_username && <p className="text-[10px] text-[#7878a8] mt-0.5">{s.discord_username}</p>}
                            {s.expected_playtime && <p className="text-[10px] text-[#7878a8]">{s.expected_playtime}</p>}
                            {s.notes && <p className="text-[10px] text-[#6868a0] italic mt-0.5 truncate">{s.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }

                const s = item.s
                const isDragging = dragging.includes(s.rsn)
                return (
                  <div key={s.id} draggable
                    onDragStart={e => { setDragging([s.rsn]); e.dataTransfer.setData('rsns', JSON.stringify([s.rsn])) }}
                    onDragEnd={() => setDragging([])}
                    className={`rounded-xl border border-[#2a2a4a] bg-[#0d0d1a] p-3 cursor-grab active:cursor-grabbing transition-opacity select-none ${isDragging ? 'opacity-40' : ''}`}>
                    <PlayerCard rsn={s.rsn} />
                    {s.discord_username && <p className="text-[10px] text-[#7878a8] mt-0.5">{s.discord_username}</p>}
                    {s.expected_playtime && <p className="text-[10px] text-[#7878a8]">{s.expected_playtime}</p>}
                    {s.preferred_partner && !confirmedPairs.has(s.rsn.toLowerCase()) && (
                      <p className="text-[10px] text-[#7878a8] mt-0.5">
                        Wants <span className="text-[#9898c0]">{s.preferred_partner}</span>
                        <span className="text-[#ED4245]/60"> (unconfirmed)</span>
                      </p>
                    )}
                    {s.notes && <p className="text-[10px] text-[#6868a0] italic mt-0.5 truncate">{s.notes}</p>}
                  </div>
                )
              })}

              {/* Assigned players, collapsed */}
              {signups.filter(s => assignedRsns.has(s.rsn.toLowerCase())).length > 0 && (
                <details className="mt-3">
                  <summary className="text-[10px] text-[#7878a8] cursor-pointer hover:text-[#9898c0] select-none">
                    {signups.filter(s => assignedRsns.has(s.rsn.toLowerCase())).length} already assigned
                  </summary>
                  <div className="mt-2 space-y-1">
                    {signups.filter(s => assignedRsns.has(s.rsn.toLowerCase())).map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#1c1c36]/40">
                        <span className="text-xs text-[#7878a8] capitalize">{s.rsn}</span>
                        <span className="text-[10px] text-[#57F287]">✓</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Non-admin: viewer notice */}
      {!isAdmin && (
        <p className="mt-6 text-center text-[10px] text-[#4a4a6a]">Live view · auto-refreshes every 20s</p>
      )}
    </div>
  )
}
