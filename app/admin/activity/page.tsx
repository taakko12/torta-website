import { fetchActivity, fetchLinks } from '../_lib/data'
import ActivityPanel from '../_components/ActivityPanel'

export default async function ActivityPage() {
  const [activity, links] = await Promise.all([fetchActivity(), fetchLinks()])
  return <ActivityPanel discord={activity.discord} ingame={activity.ingame} vc={activity.vc} links={links} />
}
