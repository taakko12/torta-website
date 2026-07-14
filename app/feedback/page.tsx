import { getSupabaseAdmin } from '@/lib/supabase-admin'
import FeedbackForm from './FeedbackForm'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

export default async function FeedbackPage() {
  const { data: config } = await getSupabaseAdmin()
    .from('guild_config')
    .select('feedback_enabled')
    .eq('guild_id', GUILD_ID)
    .maybeSingle()

  if (!config?.feedback_enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-xl font-bold text-[#e8e8f0] mb-2">Feedback is currently closed</h1>
        <p className="text-sm text-[#7878a8]">The feedback form is not accepting submissions right now. Check back later.</p>
      </div>
    )
  }

  return <FeedbackForm />
}
