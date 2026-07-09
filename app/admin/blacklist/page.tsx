import { fetchBlacklist } from '../_lib/data'
import BlacklistPanel from '../_components/BlacklistPanel'

export default async function BlacklistPage() {
  const entries = await fetchBlacklist()
  return <BlacklistPanel initialEntries={entries} />
}
