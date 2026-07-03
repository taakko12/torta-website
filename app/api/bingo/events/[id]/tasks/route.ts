import { NextResponse } from 'next/server'
import { getEventTasks } from '@/lib/bingo'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tasks = await getEventTasks(id)
  return NextResponse.json({ tasks })
}
