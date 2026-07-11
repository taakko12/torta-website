import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

function computeLeaderboard(deposits: { player: string; gp: number; action: string }[]) {
  const totals: Record<string, { player: string; net: number; deposited: number }> = {}
  for (const row of deposits) {
    if (!totals[row.player]) totals[row.player] = { player: row.player, net: 0, deposited: 0 }
    if (row.action === 'deposited') { totals[row.player].net += Number(row.gp); totals[row.player].deposited += Number(row.gp) }
    else totals[row.player].net -= Number(row.gp)
  }
  return Object.values(totals).sort((a, b) => b.net - a.net)
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const [{ data: deposits }, { data: config }] = await Promise.all([
    db.from('coffer_deposits').select('id, player, gp, action, recorded_at').eq('guild_id', GUILD_ID).order('recorded_at', { ascending: false }).limit(300),
    db.from('guild_config').select('coffer_channel_id, coffer_leaderboard_channel_id, coffer_leaderboard_message_id').eq('guild_id', GUILD_ID).maybeSingle(),
  ])

  const leaderboard = computeLeaderboard((deposits ?? []) as { player: string; gp: number; action: string }[])

  return NextResponse.json({
    leaderboard,
    recent: deposits ?? [],
    config: {
      cofferChannelId: config?.coffer_channel_id ?? null,
      leaderboardChannelId: config?.coffer_leaderboard_channel_id ?? null,
      leaderboardMessageId: config?.coffer_leaderboard_message_id ?? null,
    },
  })
}

export async function DELETE(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await getSupabaseAdmin().from('coffer_deposits').delete().eq('id', id).eq('guild_id', GUILD_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
