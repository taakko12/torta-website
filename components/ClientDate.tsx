'use client'

export function ClientDate({ iso }: { iso: string }) {
  return (
    <span>
      {new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )
}
