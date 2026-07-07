import { getGroupBulkHiscores } from '@/lib/wom'
import ClanHiscores from '@/components/ClanHiscores'

export const revalidate = 300

export const metadata = {
  title: 'Hiscores — Torta',
  description: 'Clan hiscores for Torta — sort by EHB, EHP, skills, and boss kills.',
}

export default async function HiscoresPage() {
  const raw = await getGroupBulkHiscores()
  const members = Object.entries(raw).map(([rsn, data]) => ({ rsn, ...data }))
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <ClanHiscores members={members} />
    </main>
  )
}
