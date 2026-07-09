import { fetchPromotions, fetchRoles } from '../_lib/data'
import PromotionsPanel from '../_components/PromotionsPanel'

export default async function PromotionsPage() {
  const [promotions, roles] = await Promise.all([fetchPromotions(), fetchRoles()])
  return <PromotionsPanel initialPromotions={promotions} roles={roles.map(r => r.name)} />
}
