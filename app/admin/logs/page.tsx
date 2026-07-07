import { fetchLogs } from '../_lib/data'
import LogsPanel from '../_components/LogsPanel'

export default async function LogsPage() {
  const logs = await fetchLogs()
  return <LogsPanel initialLogs={logs} />
}
