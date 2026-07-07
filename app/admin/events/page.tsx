import { fetchClanEvents, fetchRaids, fetchChannels } from '../_lib/data'
import { getActiveCompetitionsWithStandings, getUpcomingCompetitions } from '@/lib/wom'
import EventsPanel from '../_components/EventsPanel'

export default async function EventsPage() {
  const [events, raids, channels, activeComps, upcomingComps] = await Promise.all([
    fetchClanEvents(), fetchRaids(), fetchChannels(),
    getActiveCompetitionsWithStandings(), getUpcomingCompetitions(),
  ])
  return (
    <EventsPanel
      initialEvents={events}
      initialRaids={raids}
      channels={channels}
      activeComps={activeComps}
      upcomingComps={upcomingComps}
    />
  )
}
