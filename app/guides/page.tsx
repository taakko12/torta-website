import Link from 'next/link'
import { getRaidForums } from '@/lib/data'

export const revalidate = 300

export const metadata = {
  title: 'Raid Guides — Torta',
  description: 'Boss and raid guides written by Torta clan members.',
}

export default async function GuidesPage() {
  const forums = await getRaidForums()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Clan Knowledge</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Raid Guides</h1>
      </div>

      {forums.length === 0 ? (
        <div className="rounded-xl border border-[#333358] bg-[#161628] px-6 py-12 text-center">
          <p className="text-[#4a4a70]">No guides published yet. Import from the admin panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {forums.map(f => (
            <Link key={f.forum_channel_id} href={`/guides/${f.forum_channel_id}`}
              className="rounded-xl border border-[#333358] bg-[#161628] p-6 hover:border-[#c89b3c]/40 hover:bg-[#1c1c36] transition-all group">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-2">⚔️ Raid Guide</p>
              <h2 className="text-lg font-bold text-[#e8e8f0] mb-3 group-hover:text-[#c89b3c] transition-colors">
                {f.forum_title ?? 'Untitled Forum'}
              </h2>
              <p className="text-xs text-[#4a4a70]">{f.thread_count} guide{f.thread_count !== 1 ? 's' : ''}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
