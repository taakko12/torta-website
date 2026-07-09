import { fetchChannels, fetchRoles, fetchGuildConfig } from '../_lib/data'
import MessengerPanel from '../_components/MessengerPanel'

export default async function MessengerPage() {
  const [channels, roles, config] = await Promise.all([fetchChannels(), fetchRoles(), fetchGuildConfig()])
  return <MessengerPanel channels={channels} roles={roles} dropsChannelId={config.drops_channel_id ?? null} />
}
