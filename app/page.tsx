import { SiemShell } from '@/components/siem-shell'
import { SiemWorkspace } from '@/components/siem-workspace'

export default function Page() {
  return <SiemShell><SiemWorkspace /></SiemShell>
}

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard | Sentinel Desk', description: 'Security operations dashboard for the AI-Powered Mini SIEM.' }
