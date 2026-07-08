import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type WomData = { displayName: string; type: string; ehp: number; ehb: number; totalLevel: number }

async function fetchOne(rsn: string): Promise<[string, WomData | null]> {
  try {
    const res = await fetch(`https://api.wiseoldman.net/v2/players/${encodeURIComponent(rsn)}`, {
      headers: { 'User-Agent': 'torta-clan-website' },
      next: { revalidate: 300 },
    })
    if (!res.ok) return [rsn, null]
    const p = await res.json()
    return [rsn.toLowerCase(), {
      displayName: p.displayName ?? rsn,
      type: p.type ?? 'regular',
      ehp: p.ehp ?? 0,
      ehb: p.ehb ?? 0,
      totalLevel: p.latestSnapshot?.data?.skills?.overall?.level ?? 0,
    }]
  } catch { return [rsn, null] }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rsns = (req.nextUrl.searchParams.get('rsns') ?? '')
    .split(',').map(r => r.trim()).filter(Boolean).slice(0, 60)

  const entries = await Promise.all(rsns.map(fetchOne))
  return NextResponse.json(Object.fromEntries(entries.filter(([, v]) => v !== null)))
}
