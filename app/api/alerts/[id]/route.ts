import { NextResponse } from 'next/server'
import { updateAlertStatus } from '@/lib/db/siem-repository'
import type { AlertStatus } from '@/lib/siem-data'

export const runtime = 'nodejs'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json() as { status?: AlertStatus }
    if (!body.status || !['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(body.status)) return NextResponse.json({ error: 'A valid alert status is required.' }, { status: 400 })
    updateAlertStatus(id, body.status)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update alert.' }, { status: 400 })
  }
}
