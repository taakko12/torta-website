import { createClient } from '@supabase/supabase-js'

// Lazy init so build-time module evaluation doesn't throw on missing env
let _client: ReturnType<typeof createClient> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): ReturnType<typeof createClient<any>> {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}
