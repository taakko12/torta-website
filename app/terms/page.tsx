export const metadata = { title: 'Terms of Service — Torta' }

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6868a0] mb-2">Legal</p>
      <h1 className="text-3xl font-black uppercase tracking-widest text-gradient-gold mb-2">Terms of Service</h1>
      <p className="text-xs text-[#5a5a7a] mb-10">Last updated: July 2025</p>

      <div className="space-y-8 text-sm text-[#b0b0d0] leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">1. Overview</h2>
          <p>This website (&ldquo;Torta&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a fan-made community tool for members of the Torta Old School RuneScape clan. By using this site or signing in with Discord, you agree to these terms.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">2. Eligibility</h2>
          <p>This service is intended for current and prospective members of the Torta OSRS clan. You must have a Discord account to sign in. You agree not to misuse the site or attempt to disrupt its operation.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">3. User Content</h2>
          <p>Drop submissions, clan applications, and other content you submit may be reviewed by clan staff and displayed publicly on this site and in our Discord server. Do not submit false or misleading information.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">4. No Warranties</h2>
          <p>This site is provided as-is for community use. We make no guarantees about uptime, accuracy of leaderboard data, or continued availability of any feature.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">5. Changes</h2>
          <p>We may update these terms at any time. Continued use of the site after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#e8e8f0] mb-2">6. Contact</h2>
          <p>Questions? Reach out to a staff member in the Torta Discord server.</p>
        </section>
      </div>
    </div>
  )
}
