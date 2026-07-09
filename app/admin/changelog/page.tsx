import { fetchChangelog, fetchChannels, fetchGuildConfig } from '../_lib/data'
import ChangelogPanel from '../_components/ChangelogPanel'

export default async function ChangelogPage() {
  const [entries, channels, config] = await Promise.all([fetchChangelog(), fetchChannels(), fetchGuildConfig()])
  return <ChangelogPanel initialEntries={entries} channels={channels} changelogChannelId={config.changelog_channel_id ?? null} />
}
