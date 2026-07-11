export const metadata = { title: 'Privacy Policy — Torta' }

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Legal</p>
      <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold mb-2">Privacy Policy</h1>
      <p className="text-xs text-[#5a5a7a] mb-10">Last updated: July 2025</p>

      <div className="space-y-8 text-sm text-[#b0b0d0] leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">1. What We Collect</h2>
          <p>When you sign in with Discord, we receive your Discord user ID, username, and avatar. We also store:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-[#9898c0]">
            <li>Your Old School RuneScape username (RSN) if you link it</li>
            <li>In-game activity data sent by the TrackScape plugin (chat, drops, deaths, clan coffer transactions)</li>
            <li>Drop submissions and clan applications you submit through this site</li>
            <li>Clan competition results and achievement milestones</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">2. How We Use It</h2>
          <p>Data is used solely to operate clan leaderboards, track competition results, manage membership, and display activity on this website and in our Discord server. We do not sell, share, or use your data for advertising.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">3. Data Storage</h2>
          <p>Data is stored in Supabase (PostgreSQL). Discord authentication is handled via Discord OAuth2. We do not store passwords.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">4. Public Information</h2>
          <p>Leaderboard entries, drop submissions, and achievement data associated with your RSN are displayed publicly on this site. Your Discord ID is never displayed publicly.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">5. Data Removal</h2>
          <p>To have your data removed, contact a staff member in the Torta Discord server. We will delete your linked RSN and remove your entries from the leaderboards upon request.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">6. Third Parties</h2>
          <p>We use Discord OAuth2 for authentication and Supabase for data storage. Their respective privacy policies apply to data they process.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">7. Contact</h2>
          <p>Questions? Reach out to a staff member in the Torta Discord server.</p>
        </section>
      </div>
    </div>
  )
}
