import { NextResponse } from 'next/server'
import { saveUpload } from '@/lib/db/siem-repository'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'A log file is required.' }, { status: 400 })
    const eventCount = saveUpload(file.name, await file.text())
    return NextResponse.json({ ok: true, eventCount })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save the uploaded log.' }, { status: 400 })
  }
}
