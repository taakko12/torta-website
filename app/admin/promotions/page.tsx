import { fetchPromotions } from '../_lib/data'
import PromotionsPanel from '../_components/PromotionsPanel'

export default async function PromotionsPage() {
  const promotions = await fetchPromotions()
  return <PromotionsPanel initialPromotions={promotions} />
}
