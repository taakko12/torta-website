import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Torta — OSRS Clan',
  description: 'Torta clan loot and plank leaderboards for Old School RuneScape',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text)' }}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="relative mt-10 py-8 text-center text-xs text-[#4a4a70]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#252540] to-transparent" />
          Torta · Built with Next.js &amp; Supabase
        </footer>
      </body>
    </html>
  )
}
