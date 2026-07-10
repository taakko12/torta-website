import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getActiveCompetitionsWithStandings, getUpcomingCompetitions } from '@/lib/wom'
import type { Competition, CompetitionWithStandings } from '@/lib/wom'
import { ClientDate } from '@/components/ClientDate'
import PollCountdown from '@/components/PollCountdown'

export const revalidate = 60

export const metadata = {
  title: 'Events — Torta',
  description: 'Upcoming raids, clan events, and competitions for Torta OSRS clan.',
}

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

type ClanEvent = {
  id: string
  title: string
  description: string | null
  event_type: string
  scheduled_at: string | null
  event_rsvps: { count: number }[]
}

type Raid = {
  id: string
  name: string
  description: string | null
  timestamp: number
  signups: { id: string; username: string }[]
  attendees: { id: string; username: string }[] | null
}

type Row =
  | { kind: 'event'; data: ClanEvent; time: Date | null }
  | { kind: 'raid'; data: Raid; time: Date }

type CompConfig = { comp_sotw_days: string | null; comp_botw_days: string | null; comp_poll_day: number | null; comp_poll_hour: number | null }

async function fetchEvents() {
  const db = getSupabaseAdmin()
  const [{ data: events }, { data: raids }, activeComps, upcomingComps, { data: configRow }] = await Promise.all([
    db.from('clan_events').select('id, title, description, event_type, scheduled_at, event_rsvps(count)').eq('guild_id', GUILD_ID).order('scheduled_at', { ascending: true, nullsFirst: false }),
    db.from('raids').select('id, name, description, timestamp, signups, attendees').eq('guild_id', GUILD_ID).order('timestamp', { ascending: true }),
    getActiveCompetitionsWithStandings(),
    getUpcomingCompetitions(),
    db.from('guild_config').select('comp_sotw_days, comp_botw_days, comp_poll_day, comp_poll_hour').eq('guild_id', GUILD_ID).maybeSingle(),
  ])
  const compConfig = configRow as CompConfig | null
  return { events: (events ?? []) as ClanEvent[], raids: (raids ?? []) as Raid[], activeComps, upcomingComps, compConfig }
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  Raid: 'bg-[#ED4245]/15 text-[#ED4245]',
  'PvM Session': 'bg-[#c89b3c]/15 text-[#c89b3c]',
  Competition: 'bg-[#5865F2]/15 text-[#7c8cf8]',
  Social: 'bg-[#57F287]/15 text-[#57F287]',
  Event: 'bg-[#7c5ce8]/15 text-[#b09cf8]',
  Other: 'bg-[#7878a8]/30 text-[#8080b0]',
}

function typeBadge(type: string) {
  const cls = EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.Other
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${cls}`}>{type}</span>
}

function timeLabel(date: Date) {
  const diff = date.getTime() - Date.now()
  const hours = Math.round(diff / (1000 * 60 * 60))
  if (hours < 0) return null
  if (hours < 1) return 'Starting soon'
  if (hours < 24) return `in ${hours}h`
  const days = Math.round(hours / 24)
  return `in ${days}d`
}

export default async function EventsPage() {
  const { events, raids, activeComps, upcomingComps, compConfig } = await fetchEvents()
  const now = Date.now()

  const rows: Row[] = [
    ...events.map(e => ({ kind: 'event' as const, data: e, time: e.scheduled_at ? new Date(e.scheduled_at) : null })),
    ...raids.map(r => ({ kind: 'raid' as const, data: r, time: new Date(r.timestamp * 1000) })),
  ]

  rows.sort((a, b) => {
    const at = a.time?.getTime() ?? Infinity
    const bt = b.time?.getTime() ?? Infinity
    return at - bt
  })

  const upcoming = rows.filter(r => !r.time || r.time.getTime() >= now)
  const past = rows.filter(r => r.time && r.time.getTime() < now).reverse()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Clan Schedule</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Events</h1>
      </div>

      {(compConfig?.comp_sotw_days || compConfig?.comp_botw_days || compConfig?.comp_poll_day != null) && (
        <div className="rounded-xl border border-[#5865F2]/20 bg-[#161628] p-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7878a8] mb-3">Competition Schedule</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {compConfig?.comp_sotw_days && (
              <div>
                <span className="text-[#57F287] font-semibold">SOTW</span>
                <span className="text-[#9898c0] ml-2">{compConfig.comp_sotw_days}</span>
              </div>
            )}
            {compConfig?.comp_botw_days && (
              <div>
                <span className="text-[#ED4245] font-semibold">BOTW</span>
                <span className="text-[#9898c0] ml-2">{compConfig.comp_botw_days}</span>
              </div>
            )}
          </div>
          {compConfig?.comp_poll_day != null && compConfig?.comp_poll_hour != null && (
            <p className="text-xs text-[#7878a8] mt-3">
              Next poll in <PollCountdown pollDay={compConfig.comp_poll_day} pollHour={compConfig.comp_poll_hour} /> — vote in <span className="text-[#c89b3c]">#events</span>
            </p>
          )}
        </div>
      )}

      {(activeComps.length > 0 || upcomingComps.length > 0) && (
        <div className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#7878a8] mb-3">⚔️ WOM Competitions</h2>
          <div className="space-y-3">
            {activeComps.map(c => <CompCard key={c.id} comp={c} live />)}
            {upcomingComps.map(c => <CompCard key={c.id} comp={c} />)}
          </div>
        </div>
      )}

      {upcoming.length === 0 ? (
        <div className="rounded-xl border border-[#333358] bg-[#161628] px-6 py-12 text-center">
          <p className="text-[#7878a8]">No upcoming events scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-12">
          {upcoming.map(row => <EventCard key={row.data.id} row={row} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#7878a8] mb-3">Past Events</h2>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 10).map(row => <EventCard key={row.data.id} row={row} past />)}
          </div>
        </>
      )}
    </div>
  )
}

function CompCard({ comp, live = false }: { comp: Competition | CompetitionWithStandings; live?: boolean }) {
  const leader = 'participations' in comp ? comp.participations[0] : null
  return (
    <div className="rounded-xl border border-[#5865F2]/30 bg-[#161628] p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-base font-semibold text-[#e8e8f0]">{comp.title}</span>
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${live ? 'bg-[#57F287]/15 text-[#57F287]' : 'bg-[#5865F2]/15 text-[#7c8cf8]'}`}>
          {live ? 'LIVE' : 'SOON'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-[#7878a8]">
        <span className="capitalize">{comp.metric.replace(/_/g, ' ')}</span>
        <span><ClientDate iso={comp.startsAt} /> → <ClientDate iso={comp.endsAt} /></span>
      </div>
      {leader && (
        <p className="mt-2 text-xs text-[#9898c0]">
          Leading: <span className="text-[#c89b3c] font-medium">{leader.player.displayName}</span>
          {' '}({leader.progress.gained.toLocaleString()} gained)
        </p>
      )}
      <div className="mt-3">
        <a
          href={`https://wiseoldman.net/competitions/${comp.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#7c8cf8] hover:text-[#a0aeff] transition-colors"
        >
          View on Wise Old Man →
        </a>
      </div>
    </div>
  )
}

function EventCard({ row, past = false }: { row: Row; past?: boolean }) {
  if (row.kind === 'event') {
    const ev = row.data
    const rsvpCount = ev.event_rsvps?.[0]?.count ?? 0
    const label = row.time ? timeLabel(row.time) : null

    return (
      <div className={`rounded-xl border bg-[#161628] p-5 ${past ? 'border-[#252540]' : 'border-[#333358]'}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-[#e8e8f0]">{ev.title}</span>
            {typeBadge(ev.event_type)}
          </div>
          {label && (
            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded bg-[#57F287]/10 text-[#57F287]">{label}</span>
          )}
        </div>
        {ev.description && <p className="text-sm text-[#9898c0] mb-3">{ev.description}</p>}
        <div className="flex items-center gap-4 text-xs text-[#7878a8]">
          {row.time ? (
            <span><ClientDate iso={row.time.toISOString()} /></span>
          ) : (
            <span>Date TBD</span>
          )}
          {rsvpCount > 0 && (
            <span className="text-[#57F287]">✓ {rsvpCount} going</span>
          )}
        </div>
      </div>
    )
  }

  // raid
  const raid = row.data
  const signupCount = raid.signups?.length ?? 0
  const isDone = !!raid.attendees
  const label = timeLabel(row.time)

  return (
    <div className={`rounded-xl border bg-[#161628] p-5 ${past ? 'border-[#252540]' : 'border-[#ED4245]/20'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold text-[#e8e8f0]">{raid.name}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-[#ED4245]/15 text-[#ED4245]">Raid</span>
          {isDone && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-[#57F287]/15 text-[#57F287]">Complete</span>}
        </div>
        {!past && label && (
          <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded bg-[#57F287]/10 text-[#57F287]">{label}</span>
        )}
      </div>
      {raid.description && <p className="text-sm text-[#9898c0] mb-3">{raid.description}</p>}
      <div className="flex items-center gap-4 text-xs text-[#7878a8]">
        <span><ClientDate iso={row.time.toISOString()} /></span>
        {signupCount > 0 && (
          <span className="text-[#c89b3c]">⚔ {signupCount} signed up</span>
        )}
        {isDone && raid.attendees && raid.attendees.length > 0 && (
          <span className="text-[#57F287]">✓ {raid.attendees.length} attended</span>
        )}
      </div>
    </div>
  )
}
