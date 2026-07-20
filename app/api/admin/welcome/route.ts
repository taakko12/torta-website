import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!
const DISCORD_API = 'https://discord.com/api/v10'

const TOS_EMBED = {
  title: '📜 Clan Rules',
  color: 0xe67e22,
  description: 'Read and agree to the following rules to gain full access to the clan.',
  fields: [
    { name: '🤝 Be Respectful', value: "We're here to have fun, earn cash, and smash goals together. Disrespect has no place here — treat everyone as you'd want to be treated." },
    { name: '🚫 No Scamming', value: 'Zero tolerance. Scamming any member will result in a ban. Use collateral when lending items so both parties are protected.' },
    { name: '😤 No Drama', value: "Don't actively cause it. If conflict does arise, both sides will be heard and mods will work to resolve it quickly and fairly." },
    { name: '🙏 No Begging', value: "Earn your coin through events and gameplay. If you need help, check the help channels or wait patiently — don't pressure people who are busy." },
    { name: '🚷 No Racism or Extreme Views', value: 'Zero tolerance, full stop. Expect an immediate ban.' },
    { name: '🗳️ Politics', value: "Feel free to discuss, but keep it civil. Don't let it slide into extreme territory — everyone has different views, respect that." },
    { name: '🔄 Rejoining Policy', value: "Leaving and coming back requires a mod discussion. No money changes hands — it's a fair review, nothing shady." },
  ],
  footer: { text: 'Click the button below to confirm you have read and agree to these rules.' },
}

const TOS_BUTTON = {
  type: 1,
  components: [{ type: 2, style: 3, label: '✅ I Agree', custom_id: 'welcome_agree' }],
}

export async function POST() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const token = process.env.DISCORD_BOT_TOKEN!
  const supabase = getSupabaseAdmin()

  const { data: cfg } = await supabase.from('guild_config')
    .select('welcome_channel_id, welcome_message_id').eq('guild_id', GUILD_ID).maybeSingle()

  if (!cfg?.welcome_channel_id) return NextResponse.json({ error: 'Welcome channel not configured' }, { status: 400 })

  // Delete old message if it exists
  if (cfg.welcome_channel_id && cfg.welcome_message_id) {
    await fetch(`${DISCORD_API}/channels/${cfg.welcome_channel_id}/messages/${cfg.welcome_message_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${token}` },
    }).catch(() => {})
  }

  const res = await fetch(`${DISCORD_API}/channels/${cfg.welcome_channel_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [TOS_EMBED], components: [TOS_BUTTON] }),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.message ?? 'Discord API error' }, { status: 500 })
  }

  const msg = await res.json()
  await supabase.from('guild_config').upsert(
    { guild_id: GUILD_ID, welcome_channel_id: cfg.welcome_channel_id, welcome_message_id: msg.id },
    { onConflict: 'guild_id' }
  )

  return NextResponse.json({ ok: true })
}
