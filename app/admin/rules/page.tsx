import { fetchGuildConfig } from '../_lib/data'
import RulesPanel from '../_components/RulesPanel'

export default async function RulesPage() {
  const config = await fetchGuildConfig()
  return <RulesPanel initialContent={config.rules_content ?? ''} />
}
