import Link from 'next/link'
import { fetchTickets } from '../_lib/data'

export default async function TicketsPage() {
  const tickets = await fetchTickets()
  const open = tickets.filter(t => t.status === 'open')
  const closed = tickets.filter(t => t.status === 'closed')

  function TicketRow({ t }: { t: (typeof tickets)[0] }) {
    const isClosed = t.status === 'closed'
    return (
      <Link href={`/admin/tickets/${t.id}`}
        className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1c1c36] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-[#e8e8f0]">{t.display_name ?? t.discord_id}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isClosed ? 'bg-[#333358] text-[#7878a8]' : 'bg-[#57F287]/15 text-[#57F287]'}`}>
              {t.status}
            </span>
          </div>
          {t.subject && <p className="text-xs text-[#7878a8] truncate">"{t.subject}"</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[#7878a8]">{t.message_count ?? 0} msg{t.message_count !== 1 ? 's' : ''}</p>
          <p className="text-xs text-[#5a5a7a]">
            {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className="text-[#5a5a7a] text-xs">›</span>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#333358] flex items-center gap-2">
          <span className="text-sm font-semibold text-[#e8e8f0]">Open</span>
          {open.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#57F287]/15 text-[#57F287]">{open.length}</span>}
        </div>
        {open.length === 0
          ? <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No open tickets.</p>
          : <ul className="divide-y divide-[#1c1c36]">{open.map(t => <li key={t.id}><TicketRow t={t} /></li>)}</ul>
        }
      </div>

      {closed.length > 0 && (
        <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden opacity-70">
          <div className="px-5 py-3 border-b border-[#333358]">
            <span className="text-sm font-semibold text-[#e8e8f0]">Closed</span>
            <span className="ml-2 text-xs text-[#7878a8]">{closed.length}</span>
          </div>
          <ul className="divide-y divide-[#1c1c36]">{closed.map(t => <li key={t.id}><TicketRow t={t} /></li>)}</ul>
        </div>
      )}
    </div>
  )
}
