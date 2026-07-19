import { fetchLinks, fetchActivity, fetchMemberNotes, fetchAbsences, fetchRoles, fetchWomLeftAlerts } from '../_lib/data'
import MembersPanel from '../_components/MembersPanel'

export default async function MembersPage() {
  const [links, activity, notes, absences, roles, womLeftAlerts] = await Promise.all([
    fetchLinks(), fetchActivity(), fetchMemberNotes(), fetchAbsences(), fetchRoles(), fetchWomLeftAlerts(),
  ])
  return (
    <MembersPanel
      initialLinks={links}
      discordActivity={activity.discord}
      ingameActivity={activity.ingame}
      vcActivity={activity.vc}
      initialNotes={notes}
      absences={absences}
      roles={roles}
      initialWomLeftAlerts={womLeftAlerts}
    />
  )
}
