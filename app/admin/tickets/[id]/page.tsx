import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchTicket } from '../../_lib/data'
import TicketDetail from '../../_components/TicketDetail'

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await fetchTicket(Number(id))
  if (!result) notFound()
  const { ticket, messages } = result

  return (
    <div className="space-y-4">
      <Link href="/admin/tickets" className="text-xs text-[#7878a8] hover:text-[#e8e8f0] transition-colors">← Back to tickets</Link>
      <TicketDetail ticket={ticket} initialMessages={messages} />
    </div>
  )
}
