import Link from 'next/link'

const links = [
  { href: '/', label: 'Home' },
  { href: '/loot', label: 'Loot' },
  { href: '/planks', label: 'Planks' },
  { href: '/achievements', label: 'Achievements' },
  { href: '/player', label: 'Players' },
  { href: '/bingo', label: 'Bingo' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2a2a4a] bg-[#07070f]/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-widest text-[#c89b3c] hover:text-[#f0c060] transition-colors uppercase">
          Torta
        </Link>
        <ul className="flex items-center gap-6">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm font-medium text-[#a0a0c0] hover:text-[#e8e8f0] transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
