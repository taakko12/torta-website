import { fetchChannels, fetchGuildConfig } from '../_lib/data'
import MessengerPanel from '../_components/MessengerPanel'

export default async function MessengerPage() {
  const [channels, config] = await Promise.all([fetchChannels(), fetchGuildConfig()])
  return <MessengerPanel channels={channels} dropsChannelId={config.drops_channel_id ?? null} />
}
