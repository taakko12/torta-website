import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin()
  const form = await req.formData()
  const rsn = (form.get('rsn') as string)?.trim()
  const taskId = form.get('task_id') as string
  const eventId = form.get('event_id') as string
  const notes = (form.get('notes') as string)?.trim() || null
  const file = form.get('file') as File | null
  const url = (form.get('url') as string)?.trim() || null

  if (!rsn || !taskId || !eventId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let screenshotUrl: string | null = url
  let screenshotPath: string | null = null

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${eventId}/${Date.now()}-${rsn.replace(/\s+/g, '_')}.${ext}`
    const bytes = await file.arrayBuffer()
    const { error } = await db.storage
      .from('bingo-screenshots')
      .upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    screenshotPath = path
    const { data: { publicUrl } } = db.storage.from('bingo-screenshots').getPublicUrl(path)
    screenshotUrl = publicUrl
  }

  const { error } = await db.from('bingo_submissions').insert({
    event_id: eventId,
    task_id: taskId,
    rsn,
    screenshot_url: screenshotUrl,
    screenshot_path: screenshotPath,
    notes,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
