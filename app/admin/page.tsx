import { fetchDashboardStats } from './_lib/data'
import DashboardPanel from './_components/DashboardPanel'

export default async function AdminPage() {
  const stats = await fetchDashboardStats()
  return <DashboardPanel stats={stats} />
}
