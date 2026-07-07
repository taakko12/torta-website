import { fetchClanEvents, fetchRaids, fetchChannels } from '../_lib/data'
import EventsPanel from '../_components/EventsPanel'

export default async function EventsPage() {
  const [events, raids, channels] = await Promise.all([fetchClanEvents(), fetchRaids(), fetchChannels()])
  return <EventsPanel initialEvents={events} initialRaids={raids} channels={channels} />
}
