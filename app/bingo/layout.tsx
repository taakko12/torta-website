import { getActiveEvent } from '@/lib/bingo'
import { getServerSession } from '@/lib/auth'
import BingoNav from '@/components/BingoNav'

export default async function BingoLayout({ children }: { children: React.ReactNode }) {
  const [event, session] = await Promise.all([getActiveEvent(), getServerSession()])
  return (
    <div className="md:flex md:min-h-[calc(100vh-57px)]">
      <BingoNav eventTitle={event?.title ?? null} isAdmin={session?.isAdmin ?? false} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
