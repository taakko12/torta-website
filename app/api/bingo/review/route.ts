import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.discordId || !(await isAdmin(session.discordId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { submissionId, action } = await req.json() as { submissionId: string; action: 'approved' | 'rejected' }
  if (!submissionId || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await getSupabaseAdmin()
    .from('bingo_submissions')
    .update({ status: action, reviewed_at: new Date().toISOString(), reviewed_by: session.user?.name ?? 'admin' })
    .eq('id', submissionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
