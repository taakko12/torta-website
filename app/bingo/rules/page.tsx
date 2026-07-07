export default function RulesPage() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-1">Rules</h1>
        <p className="text-sm text-[#6868a0]">How bingo works</p>
      </div>

      <div className="rounded-xl border border-[#2c2c4e] bg-[#161628] p-6 space-y-6">
        {[
          {
            title: 'How to Play',
            body: 'Complete tasks on the bingo board to earn points for your team. Submit your drops using the Submit Drop button — every submission is reviewed by an admin before counting.',
          },
          {
            title: 'Submitting Drops',
            body: 'Include your RSN, select the task, and attach a screenshot or image URL as proof. Gyazo, Imgur, and direct uploads are all accepted.',
          },
          {
            title: 'Scoring',
            body: 'Each task has a point value. Some tasks require multiple submissions to complete. Points are awarded once the required count is met. Partial credit may apply for multi-submission tasks.',
          },
          {
            title: 'Team Rules',
            body: 'Your RSN must be registered to your team by an admin. Only drops submitted by a team member count toward that team\'s score.',
          },
          {
            title: 'Fair Play',
            body: 'All submissions must be legitimate in-game achievements. Edited screenshots or false submissions will result in disqualification.',
          },
        ].map(({ title, body }) => (
          <div key={title} className="border-l-2 border-[#7c5ce8]/40 pl-4">
            <h2 className="text-sm font-bold text-[#c89b3c] uppercase tracking-widest mb-1.5">{title}</h2>
            <p className="text-sm text-[#8888b0] leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#4a4a70] mt-4 text-center">
        Questions? Ask in the Torta Discord.
      </p>
    </div>
  )
}
