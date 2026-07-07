import { fetchLinks, fetchActivity } from '../_lib/data'
import MembersPanel from '../_components/MembersPanel'

export default async function MembersPage() {
  const [links, activity] = await Promise.all([fetchLinks(), fetchActivity()])
  return <MembersPanel initialLinks={links} discordActivity={activity.discord} ingameActivity={activity.ingame} />
}
