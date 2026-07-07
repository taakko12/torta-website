import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRaidGuides } from '@/lib/data'
import { ClientDate } from '@/components/ClientDate'

export const revalidate = 300

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const guides = await getRaidGuides(id)
  if (!guides.length) return { title: 'Guide Not Found — Torta' }
  const forumTitle = guides[0].forum_title ?? 'Raid Guides'
  return {
    title: `${forumTitle} — Torta Guides`,
    description: `${guides.length} guides for ${forumTitle}.`,
  }
}

export default async function ForumPage({ params }: Props) {
  const { id } = await params
  const guides = await getRaidGuides(id)
  if (!guides.length) notFound()

  const forumTitle = guides[0].forum_title ?? 'Raid Guides'

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/guides" className="text-xs text-[#7070a0] hover:text-[#c89b3c] transition-colors mb-6 inline-block">
        ← Back to Guides
      </Link>

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Raid Guide</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">{forumTitle}</h1>
      </div>

      <div className="space-y-3">
        {guides.map(g => (
          <Link key={g.id} href={`/guides/${id}/${g.id}`}
            className="rounded-xl border border-[#333358] bg-[#161628] p-5 flex items-center justify-between gap-4 hover:border-[#c89b3c]/40 hover:bg-[#1c1c36] transition-all group">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#e8e8f0] group-hover:text-[#c89b3c] transition-colors">{g.title}</h2>
              <p className="text-xs text-[#4a4a70] mt-0.5">Updated <ClientDate iso={g.created_at} /></p>
            </div>
            <span className="shrink-0 text-[#4a4a70] group-hover:text-[#c89b3c] text-sm">→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
