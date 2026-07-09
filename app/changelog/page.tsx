import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 60

export const metadata = {
  title: 'Changelog — Torta',
  description: 'Recent updates to the Torta clan bot and website.',
}

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

const CATEGORY_COLORS: Record<string, string> = {
  'Bot Update':   'bg-[#7c5ce8]/15 text-[#b0a0ff]',
  'Website':      'bg-[#5865F2]/15 text-[#9da8fa]',
  'Rules':        'bg-[#ED4245]/15 text-[#f87b7e]',
  'Announcement': 'bg-[#c89b3c]/15 text-[#e8be5a]',
  'Event':        'bg-[#57F287]/15 text-[#57F287]',
}

type Entry = { id: number; title: string; content: string | null; category: string; published_at: string }

async function fetchEntries(): Promise<Entry[]> {
  const { data } = await getSupabaseAdmin()
    .from('changelog')
    .select('id, title, content, category, published_at')
    .eq('guild_id', GUILD_ID)
    .order('published_at', { ascending: false })
    .limit(100)
  return (data ?? []) as Entry[]
}

export default async function ChangelogPage() {
  const entries = await fetchEntries()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">What&apos;s New</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Changelog</h1>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-[#333358] bg-[#161628] px-6 py-12 text-center">
          <p className="text-[#7878a8]">No entries yet.</p>
        </div>
      ) : (
        <ol className="relative border-l border-[#333358] ml-3 space-y-8">
          {entries.map(e => {
            const date = new Date(e.published_at)
            const badgeCls = CATEGORY_COLORS[e.category] ?? 'bg-[#333358] text-[#9898c0]'
            return (
              <li key={e.id} className="ml-6">
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border border-[#333358] bg-[#0f0f1e]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7c5ce8]" />
                </span>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <time className="text-xs text-[#5a5a7a]">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>{e.category}</span>
                </div>
                <h3 className="text-base font-semibold text-[#e8e8f0] mb-1">{e.title}</h3>
                {e.content && <p className="text-sm text-[#9898c0] whitespace-pre-wrap">{e.content}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
