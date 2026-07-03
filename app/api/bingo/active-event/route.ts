import { NextResponse } from 'next/server'
import { getActiveEvent, getEventTasks } from '@/lib/bingo'

export async function GET() {
  const event = await getActiveEvent()
  if (!event) return NextResponse.json({ event: null, tasks: [] })
  const tasks = await getEventTasks(event.id)
  return NextResponse.json({ event, tasks })
}
