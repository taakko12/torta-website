import Link from 'next/link'
import { getRaidGuides } from '@/lib/data'
import { ClientDate } from '@/components/ClientDate'

export const revalidate = 300

export const metadata = {
  title: 'Raid Guides — Torta',
  description: 'Boss and raid guides written by Torta clan members.',
}

export default async function GuidesPage() {
  const guides = await getRaidGuides()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Clan Knowledge</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Raid Guides</h1>
      </div>

      {guides.length === 0 ? (
        <div className="rounded-xl border border-[#333358] bg-[#161628] px-6 py-12 text-center">
          <p className="text-[#4a4a70]">No guides published yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guides.map(g => (
            <Link key={g.id} href={`/guides/${g.id}`}
              className="rounded-xl border border-[#333358] bg-[#161628] p-5 hover:border-[#c89b3c]/40 hover:bg-[#1c1c36] transition-all group">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-2">⚔️ Raid Guide</p>
              <h2 className="text-base font-bold text-[#e8e8f0] mb-2 group-hover:text-[#c89b3c] transition-colors">{g.title}</h2>
              <p className="text-xs text-[#7070a0] line-clamp-3 mb-3">
                {g.content.slice(0, 180).replace(/[#*`_]/g, '')}
                {g.content.length > 180 ? '…' : ''}
              </p>
              <p className="text-xs text-[#4a4a70]">Updated <ClientDate iso={g.created_at} /></p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
