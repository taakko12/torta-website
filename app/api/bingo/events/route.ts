import { NextResponse } from 'next/server'
import { getAllEvents } from '@/lib/bingo'

export async function GET() {
  const events = await getAllEvents()
  return NextResponse.json({ events })
}
