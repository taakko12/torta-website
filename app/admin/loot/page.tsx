import { fetchDrops } from '../_lib/data'
import LootPanel from '../_components/LootPanel'

export default async function LootPage() {
  const drops = await fetchDrops()
  return <LootPanel drops={drops} />
}
