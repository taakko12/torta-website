export default function SignUpPage() {
  return (
    <div className="px-6 py-16 max-w-2xl mx-auto text-center">
      <p className="text-5xl mb-5">✍️</p>
      <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-3">Sign Ups</h1>
      <p className="text-[#6868a0] text-sm mb-8 leading-relaxed">
        Sign-ups for the current bingo event are managed by admins.<br />
        Join the Torta Discord and post your RSN to get assigned to a team.
      </p>
      <div className="rounded-xl border border-[#252540] bg-[#0d0d1e] p-6 text-left space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-[#7c5ce8] text-lg shrink-0">1.</span>
          <div>
            <p className="text-sm font-semibold text-[#e8e8f0]">Join the Discord</p>
            <p className="text-xs text-[#6868a0] mt-0.5">If you're not already in the Torta Discord server, that's the first step.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#7c5ce8] text-lg shrink-0">2.</span>
          <div>
            <p className="text-sm font-semibold text-[#e8e8f0]">Post your RSN</p>
            <p className="text-xs text-[#6868a0] mt-0.5">Share your in-game name in the bingo sign-up channel.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-[#7c5ce8] text-lg shrink-0">3.</span>
          <div>
            <p className="text-sm font-semibold text-[#e8e8f0]">Get assigned</p>
            <p className="text-xs text-[#6868a0] mt-0.5">An admin will assign you to a team. You'll then be able to submit drops.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
