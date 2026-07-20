'use client'
import type { Channel, GuildConfig } from '../_lib/data'
import { FIELD } from './ui'

const CHANNEL_SETTINGS: [string, keyof GuildConfig, string][] = [
  ['TrackScape Clan Chat',        'clanchat_channel_id',              'In-game clan chat relay'],
  ['TrackScape Broadcasts',       'broadcast_channel_id',             'Drops, pets, quests, achievements'],
  ['Coffer Channel',              'coffer_channel_id',                'Coffer deposits/withdrawals (defaults to Broadcasts if not set)'],
  ['Coffer Leaderboard Channel',  'coffer_leaderboard_channel_id',    'Channel that holds the pinned coffer leaderboard embed'],
  ['Planks Channel',              'planks_channel_id',                'Death notifications (Dink)'],
  ['Drops Channel',               'drops_channel_id',                 'Loot drops (Dink)'],
  ['Loot Submit Channel',         'lootsubmit_channel_id',            'Staff review for manual submissions'],
  ['Welcome Channel',             'welcome_channel_id',               'New member welcome messages'],
  ['Welcome Mod Channel',         'welcome_mod_channel_id',           'Staff review for welcomes'],
  ['Weekly Recap Channel',        'recap_channel_id',                 'Sunday activity recap post'],
  ['Moderator Recap Channel',     'inactivity_channel_id',            'Monday recap, WOM departures, feedback, and BOTW/SOTW winner approvals'],
  ['Changelog Channel',           'changelog_channel_id',             'Optional: post new changelog entries here'],
]

type Props = { config: GuildConfig; channels: Channel[]; saveConfig: (patch: Partial<GuildConfig>) => void }

export default function SettingsChannelsTab({ config, channels, saveConfig }: Props) {
  const sel = `flex-1 ${FIELD}`

  return (
    <div className="rounded-xl border border-[#333358] bg-[#161628] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#333358]">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c]">Bot Channel Settings</h2>
        <p className="text-xs text-[#7878a8] mt-1">
          Changes save immediately on selection.{channels.length > 0 ? ` ${channels.length} channels loaded.` : ' No channels loaded — check bot token in Railway.'}
        </p>
      </div>
      <div className="px-5">
        {CHANNEL_SETTINGS.map(([label, key, hint]) => (
          <div key={key} className="flex items-center gap-4 py-3 border-b border-[#1c1c36] last:border-0">
            <div className="w-52 shrink-0">
              <div className="text-sm text-[#c0c0e0]">{label}</div>
              <div className="text-xs text-[#7878a8] mt-0.5">{hint}</div>
            </div>
            <select value={(config[key] as string | null | undefined) ?? ''} onChange={e => saveConfig({ [key]: e.target.value || null })} className={sel}>
              <option value="">— Not set —</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
