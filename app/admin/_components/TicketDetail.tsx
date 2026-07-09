'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Ticket, TicketMessage } from '../_lib/data'

type Props = { ticket: Ticket; initialMessages: TicketMessage[] }

export default function TicketDetail({ ticket, initialMessages }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  async function sendReply() {
    if (!reply.trim()) return
    setSending(true); setStatus(null)
    const res = await fetch(`/api/admin/tickets/${ticket.id}/reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: reply }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, data.message])
      setReply('')
    } else {
      setStatus(`❌ ${data.error}`)
    }
    setSending(false)
  }

  async function setTicketStatus(newStatus: string) {
    setClosing(true)
    await fetch(`/api/admin/tickets/${ticket.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
    setClosing(false)
  }

  const isClosed = ticket.status === 'closed'

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[#e8e8f0]">{ticket.display_name ?? ticket.discord_id}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isClosed ? 'bg-[#333358] text-[#7878a8]' : 'bg-[#57F287]/15 text-[#57F287]'}`}>
              {ticket.status}
            </span>
          </div>
          <p className="text-xs text-[#7878a8]">
            Ticket #{ticket.id} · {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {ticket.subject && <p className="text-sm text-[#9898c0] mt-1 italic">"{ticket.subject}"</p>}
        </div>
        <button onClick={() => setTicketStatus(isClosed ? 'open' : 'closed')} disabled={closing}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-40 shrink-0 ${
            isClosed
              ? 'border-[#57F287]/30 text-[#57F287] hover:bg-[#57F287]/10'
              : 'border-[#7878a8]/30 text-[#7878a8] hover:text-[#e8e8f0] hover:border-[#7878a8]/60'
          }`}>
          {closing ? '…' : isClosed ? 'Reopen' : 'Close Ticket'}
        </button>
      </div>

      {/* Conversation */}
      <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
        {messages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7878a8]">No messages yet.</p>
        ) : (
          <ul className="divide-y divide-[#1c1c36]">
            {messages.map(m => {
              const isOut = m.direction === 'outbound'
              return (
                <li key={m.id} className={`px-5 py-4 ${isOut ? 'bg-[#1c1c36]/50' : ''}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isOut ? 'bg-[#7c5ce8]/20 text-[#b0a0ff]' : 'bg-[#5865F2]/20 text-[#9da8fa]'}`}>
                      {isOut ? 'Mod' : 'Member'}
                    </span>
                    <span className="text-xs font-medium text-[#9898c0]">{m.author_name ?? (isOut ? 'Mod' : ticket.display_name)}</span>
                    <span className="text-xs text-[#5a5a7a] ml-auto">
                      {new Date(m.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-[#e8e8f0] whitespace-pre-wrap">{m.content}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Reply box */}
      {!isClosed && (
        <div className="rounded-xl border border-[#333358] bg-[#161628] p-4 space-y-3">
          <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
            placeholder="Type your reply… it will be sent as a DM to the member."
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
            className="w-full bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[#424268] resize-none" />
          <div className="flex items-center gap-3">
            <button onClick={sendReply} disabled={sending || !reply.trim()}
              className="px-4 py-2 rounded-lg bg-[#7c5ce8] text-white text-sm font-semibold hover:bg-[#6b4fd4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {sending ? 'Sending…' : 'Send Reply'}
            </button>
            <span className="text-xs text-[#5a5a7a]">⌘↵ to send</span>
            {status && <span className="text-sm text-[#a0a0c0]">{status}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
