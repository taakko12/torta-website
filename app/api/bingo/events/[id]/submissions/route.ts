import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const status = req.nextUrl.searchParams.get('status')
  let q = supabase.from('bingo_submissions').select('*').eq('event_id', id).order('submitted_at', { ascending: true })
  if (status) q = q.eq('status', status)
  const { data } = await q
  return NextResponse.json({ submissions: data ?? [] })
}
