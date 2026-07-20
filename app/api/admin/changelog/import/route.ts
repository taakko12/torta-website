import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'

const REPOS = [
  { slug: 'taakko12/torta-website', label: 'Website' },
  { slug: 'taakko12/Torta',         label: 'Bot' },
]

const CATEGORY_MAP: Record<string, Record<string, string>> = {
  Website: { feat: 'Website', fix: 'Website' },
  Bot:     { feat: 'Bot Update', fix: 'Bot Update' },
}

function parseCommit(message: string, repoLabel: string) {
  const match = message.match(/^(feat|fix|chore|refactor|docs|style|test|perf|ci)(\([^)]+\))?:\s*(.+)/i)
  if (!match) return null
  const type = match[1].toLowerCase()
  const title = match[3].split('\n')[0].trim()
  const category = CATEGORY_MAP[repoLabel]?.[type] ?? 'Announcement'
  return { title, category }
}

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const token = process.env.GITHUB_TOKEN
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const results = await Promise.all(REPOS.map(async ({ slug, label }) => {
    const res = await fetch(`https://api.github.com/repos/${slug}/commits?per_page=40`, { headers })
    if (!res.ok) return []
    const commits = await res.json() as { sha: string; commit: { message: string; author: { date: string } } }[]
    return commits.flatMap(c => {
      const parsed = parseCommit(c.commit.message, label)
      if (!parsed) return []
      return [{
        sha: c.sha.slice(0, 7),
        title: parsed.title,
        category: parsed.category,
        repo: label,
        date: c.commit.author.date,
      }]
    })
  }))

  const commits = results.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return NextResponse.json({ commits })
}
