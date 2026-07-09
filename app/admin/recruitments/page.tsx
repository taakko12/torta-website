import { fetchRecruitments } from '../_lib/data'
import RecruitmentsPanel from '../_components/RecruitmentsPanel'

export default async function RecruitmentsPage() {
  const recruitments = await fetchRecruitments()
  return <RecruitmentsPanel recruitments={recruitments} />
}
