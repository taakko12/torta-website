import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

const CATEGORY_COLORS: Record<string, string> = {
  Events:  'bg-[#5865F2]/15 text-[#a5acff]',
  Discord: 'bg-[#57F287]/15 text-[#57F287]',
  Bot:     'bg-[#FEE75C]/15 text-[#d4b800]',
  Website: 'bg-[#EB459E]/15 text-[#f091c4]',
}

export default async function FeedbackPage() {
  const { data: entries } = await getSupabaseAdmin()
    .from('feedback')
    .select('id, category, message, created_at')
    .eq('guild_id', GUILD_ID)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#e8e8f0]">Feedback</h2>
        <span className="text-xs text-[#7878a8]">{entries?.length ?? 0} entries</span>
      </div>

      {!entries?.length ? (
        <div className="rounded-xl border border-[#333358] bg-[#161628] px-5 py-12 text-center text-sm text-[#7878a8]">
          No feedback yet.
        </div>
      ) : (
        <div className="rounded-xl border border-[#333358] bg-[#161628] divide-y divide-[#1c1c36]">
          {entries.map(e => (
            <div key={e.id} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${CATEGORY_COLORS[e.category] ?? 'bg-white/10 text-[#9898c0]'}`}>
                  {e.category}
                </span>
                <span className="text-xs text-[#424268]">
                  {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-[#c8c8e0] leading-relaxed">{e.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
