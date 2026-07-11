import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const SALT = process.env.COTM_IP_SALT ?? 'torta-cotm'

function currentMonth() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

function hashIp(ip: string) {
  return createHash('sha256').update(ip + SALT).digest('hex').slice(0, 16)
}

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
}

export async function GET() {
  const month = currentMonth()
  const db = getSupabaseAdmin()
  const [{ data: votes }, { data: winner }] = await Promise.all([
    db.from('cotm_nominations').select('nominee_name').eq('guild_id', GUILD_ID).eq('month', month),
    db.from('cotm_winners').select('winner_name, note, month').eq('guild_id', GUILD_ID).order('month', { ascending: false }).limit(6),
  ])
  const tally: Record<string, number> = {}
  for (const v of votes ?? []) tally[v.nominee_name] = (tally[v.nominee_name] ?? 0) + 1
  const leaderboard = Object.entries(tally).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  return NextResponse.json({ leaderboard, month, winners: winner ?? [] })
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const ipHash = hashIp(ip)
  const month = currentMonth()
  const { nominee_name } = await req.json()
  if (!nominee_name?.trim()) return NextResponse.json({ error: 'nominee_name required' }, { status: 400 })
  const db = getSupabaseAdmin()
  const { error } = await db.from('cotm_nominations').upsert(
    { guild_id: GUILD_ID, nominee_name: nominee_name.trim(), voter_ip_hash: ipHash, month },
    { onConflict: 'guild_id,voter_ip_hash,month' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
