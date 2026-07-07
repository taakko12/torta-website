import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

const DEFAULTS = {
  weeklyRecap: { day: 0, hour: 20 },
  modRecap:    { day: 1, hour: 9  },
}

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

async function getGuildData() {
  const db = getSupabaseAdmin()
  const { data } = await db.from('guild_data').select('data').eq('guild_id', GUILD_ID).single()
  return data?.data ?? {}
}

async function saveGuildData(data: object) {
  await getSupabaseAdmin().from('guild_data').upsert({ guild_id: GUILD_ID, data }, { onConflict: 'guild_id' })
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getGuildData()
  const jobs = data.scheduledJobs ?? {}
  return NextResponse.json({
    weeklyRecap: { ...DEFAULTS.weeklyRecap, ...jobs.weeklyRecap },
    modRecap:    { ...DEFAULTS.modRecap,    ...jobs.modRecap    },
  })
}

export async function PATCH(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, day, hour } = await req.json()
  if (!['weeklyRecap', 'modRecap'].includes(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }
  const data = await getGuildData()
  if (!data.scheduledJobs) data.scheduledJobs = {}
  data.scheduledJobs[key] = { day: Number(day), hour: Number(hour) }
  await saveGuildData(data)
  return NextResponse.json({ ok: true })
}
