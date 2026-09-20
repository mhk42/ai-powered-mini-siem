import { notFound } from 'next/navigation'
import { SiemShell } from '@/components/siem-shell'
import { SiemWorkspace } from '@/components/siem-workspace'

const views = new Set(['events', 'alerts', 'hosts', 'users', 'detection-rules', 'investigations', 'settings'])

export default async function WorkspaceRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  if (slug.length !== 1 || !views.has(slug[0])) notFound()
  return <SiemShell><SiemWorkspace view={slug[0] as 'events' | 'alerts' | 'hosts' | 'users' | 'detection-rules' | 'investigations' | 'settings'} /></SiemShell>
}
