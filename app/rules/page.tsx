import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 120

export const metadata = {
  title: 'Rules — Torta',
  description: 'Clan rules and guidelines for Torta OSRS.',
}

const GUILD_ID = process.env.NEXT_PUBLIC_GUILD_ID!

async function fetchRules(): Promise<string> {
  const { data } = await getSupabaseAdmin().from('guild_config').select('rules_content').eq('guild_id', GUILD_ID).maybeSingle()
  return data?.rules_content ?? ''
}

// Bare-minimum markdown renderer: headings, bold, italic, bullet lists, paragraphs
function renderMarkdown(md: string) {
  const lines = md.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-[#e8e8f0] mt-5 mb-2">{inline(line.slice(4))}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-[#c89b3c] mt-7 mb-2 border-b border-[#333358] pb-1">{inline(line.slice(3))}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-black text-[#e8e8f0] mb-4">{inline(line.slice(2))}</h1>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: React.ReactNode[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i}>{inline(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-inside text-[#9898c0] text-sm space-y-1 ml-2 mb-3">{items}</ul>)
      continue
    } else if (line.trim() === '') {
      // skip blank lines
    } else {
      elements.push(<p key={i} className="text-[#9898c0] text-sm leading-relaxed mb-3">{inline(line)}</p>)
    }
    i++
  }
  return elements
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="text-[#e8e8f0] font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
    return p
  })
}

export default async function RulesPage() {
  const content = await fetchRules()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Guidelines</p>
        <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold">Rules</h1>
      </div>

      {!content ? (
        <div className="rounded-xl border border-[#333358] bg-[#161628] px-6 py-12 text-center">
          <p className="text-[#7878a8]">No rules have been published yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#333358] bg-[#161628] px-8 py-6">
          {renderMarkdown(content)}
        </div>
      )}
    </div>
  )
}
