import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // OSRS wiki item sprites (used by Dink webhook embeds)
      { protocol: 'https', hostname: 'oldschool.runescape.wiki' },
      // Discord CDN (fallback — note these URLs expire after ~24h)
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'media.discordapp.net' },
    ],
  },
}

export default nextConfig
