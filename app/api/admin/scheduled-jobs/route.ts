import { NextResponse } from 'next/server'
import { getServerSession, isAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

const VALID_KEYS = ['weeklyRecap','modRecap','pollRoll','monthlyReset','womSync','vcFlush']

const DEFAULTS = {
  weeklyRecap:  { day: 0, hour: 20, enabled: true, sections: { discordChatters: true, ingameChatters: true, vcTime: true, topDrops: true, deaths: true } },
  modRecap:     { day: 1, hour: 9,  enabled: true },
  pollRoll:     { day: 6, hour: 12, enabled: true },
  monthlyReset: { dayOfMonth: 1, hour: 0, enabled: true },
  womSync:      { intervalHours: 1, enabled: true },
  vcFlush:      { intervalMinutes: 5, enabled: true },
}

async function auth() {
  const session = await getServerSession()
  if (!session || !await isAdmin(session.discordId!)) return null
  return session
}

async function getGuildData() {
  const { data } = await getSupabaseAdmin().from('guild_data').select('data').eq('guild_id', GUILD_ID).single()
  return data?.data ?? {}
}

async function saveGuildData(data: object) {
  await getSupabaseAdmin().from('guild_data').upsert({ guild_id: GUILD_ID, data }, { onConflict: 'guild_id' })
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getGuildData()
  const stored = data.scheduledJobs ?? {}
  const result = Object.fromEntries(
    Object.entries(DEFAULTS).map(([k, def]) => [k, { ...def, ...(stored[k] ?? {}) }])
  )
  return NextResponse.json(result)
}

export async function PATCH(req: Request) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { key, ...values } = body
  if (!VALID_KEYS.includes(key)) return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  const data = await getGuildData()
  if (!data.scheduledJobs) data.scheduledJobs = {}
  data.scheduledJobs[key] = { ...(DEFAULTS[key as keyof typeof DEFAULTS] ?? {}), ...data.scheduledJobs[key], ...values }
  await saveGuildData(data)
  return NextResponse.json({ ok: true })
}
