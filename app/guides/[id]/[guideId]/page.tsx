import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRaidGuides } from '@/lib/data'
import { ClientDate } from '@/components/ClientDate'

export const revalidate = 300

type Props = { params: Promise<{ id: string; guideId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, guideId } = await params
  const guides = await getRaidGuides(id)
  const guide = guides.find(g => g.id === guideId)
  if (!guide) return { title: 'Guide Not Found — Torta' }
  return {
    title: `${guide.title} — Torta Guides`,
    description: guide.content.slice(0, 160).replace(/[#*`_[\]()]/g, ''),
  }
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-[#e8e8f0] font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="px-1 py-0.5 rounded bg-[#1c1c36] text-[#a0e0c0] text-xs font-mono">{part.slice(1, -1)}</code>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link)
      return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-[#7c8cf8] hover:underline">{link[1]}</a>
    return part
  })
}

function renderContent(text: string) {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++ }
      out.push(
        <pre key={i} className="bg-[#0a0a18] border border-[#2c2c4e] rounded-lg p-4 overflow-x-auto my-3">
          <code className="text-sm text-[#a0e0c0] font-mono whitespace-pre">{codeLines.join('\n')}</code>
        </pre>
      )
      i++; continue
    }
    if (line === '---') {
      out.push(<hr key={i} className="my-6 border-[#2c2c4e]" />)
    } else if (line.startsWith('# ')) {
      out.push(<h2 key={i} className="text-lg font-bold text-[#c89b3c] mt-5 mb-2">{inlineFormat(line.slice(2))}</h2>)
    } else if (line.startsWith('## ')) {
      out.push(<h3 key={i} className="text-base font-bold text-[#e8e8f0] mt-4 mb-1">{inlineFormat(line.slice(3))}</h3>)
    } else if (line.startsWith('### ')) {
      out.push(<h4 key={i} className="text-sm font-bold text-[#a0a0c0] uppercase tracking-wide mt-3 mb-1">{inlineFormat(line.slice(4))}</h4>)
    } else if (line.trim() === '') {
      out.push(<div key={i} className="h-2" />)
    } else {
      out.push(<p key={i} className="text-sm text-[#c8c8e0] leading-relaxed">{inlineFormat(line)}</p>)
    }
    i++
  }
  return out
}

export default async function GuidePage({ params }: Props) {
  const { id, guideId } = await params
  const guides = await getRaidGuides(id)
  const guide = guides.find(g => g.id === guideId)
  if (!guide) notFound()

  const forumTitle = guide.forum_title ?? 'Raid Guides'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-2 text-xs text-[#7070a0] mb-6">
        <Link href="/guides" className="hover:text-[#c89b3c] transition-colors">Guides</Link>
        <span>/</span>
        <Link href={`/guides/${id}`} className="hover:text-[#c89b3c] transition-colors">{forumTitle}</Link>
      </div>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c89b3c] mb-2">⚔️ {forumTitle}</p>
        <h1 className="text-2xl font-black uppercase tracking-wide text-[#e8e8f0] mb-2">{guide.title}</h1>
        <p className="text-xs text-[#4a4a70]">Last updated <ClientDate iso={guide.created_at} /></p>
      </div>

      <div className="rounded-xl border border-[#333358] bg-[#161628] p-6 space-y-1">
        {renderContent(guide.content)}
      </div>
    </div>
  )
}
