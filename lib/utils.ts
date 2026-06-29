export const MEDALS = ['🥇', '🥈', '🥉']

export function formatGp(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B gp`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M gp`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K gp`
  return `${value} gp`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function currentMonthLabel(): string {
  return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
}
