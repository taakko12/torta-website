import { fetchChannels, fetchRoles, fetchGuildConfig } from '../_lib/data'
import SettingsPanel from '../_components/SettingsPanel'

export default async function SettingsPage() {
  const [channels, roles, config] = await Promise.all([fetchChannels(), fetchRoles(), fetchGuildConfig()])
  return <SettingsPanel config={config} channels={channels} roles={roles} />
}
