import { fetchPromotions, fetchRoles, fetchMembersForPromotion } from '../_lib/data'
import PromotionsPanel from '../_components/PromotionsPanel'

export default async function PromotionsPage() {
  const [promotions, roles, members] = await Promise.all([
    fetchPromotions(), fetchRoles(), fetchMembersForPromotion(),
  ])
  return <PromotionsPanel initialPromotions={promotions} roles={roles} members={members} />
}
