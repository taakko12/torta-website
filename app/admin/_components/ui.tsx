export const CARD = 'rounded-xl border border-[#333358] bg-[#161628] overflow-hidden'
export const FIELD = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-3 py-2 text-sm outline-none focus:border-[#7c5ce8]/60'
export const FIELD_SM = 'rounded-lg bg-[#1c1c36] border border-[#333358] text-[#e8e8f0] px-2 py-1.5 text-xs outline-none focus:border-[#7c5ce8]/60'

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={on ? 'Enabled — click to disable' : 'Disabled — click to enable'}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 ${on ? 'bg-[#57F287] border-[#57F287]' : 'bg-[#2a2a4a] border-[#333358]'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}
