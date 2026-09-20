import { NextResponse } from 'next/server'
import { getWorkspaceState } from '@/lib/db/siem-repository'

export const runtime = 'nodejs'

export function GET() {
  return NextResponse.json(getWorkspaceState())
}
