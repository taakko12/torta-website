'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-xs text-[#7070a0] hover:text-[#e8e8f0] transition-colors"
    >
      Sign out
    </button>
  )
}
