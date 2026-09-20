'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  Database,
  FileSearch,
  LayoutDashboard,
  ListChecks,
  Menu,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Events', href: '/events', icon: Activity },
  { label: 'Alerts', href: '/alerts', icon: Bell, count: 5 },
  { label: 'Hosts', href: '/hosts', icon: Network },
  { label: 'Users', href: '/users', icon: Users },
]

const operations = [
  { label: 'Detection rules', href: '/detection-rules', icon: ListChecks },
  { label: 'Investigations', href: '/investigations', icon: FileSearch },
]

export function SiemShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#17212b]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-[#dbe2e8] bg-[#13212b] text-white transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-6">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2d8c84] shadow-[0_0_0_4px_rgba(45,140,132,0.15)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-tight">Sentinel Desk</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-[#8ea4ad]">Mini SIEM</span>
            </span>
          </Link>
          <button type="button" className="rounded-md p-1 text-[#9db0b7] hover:bg-white/10 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label="Primary navigation">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#718791]">Workspace</p>
          <div className="space-y-1">
            {navigation.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href} closeMenu={() => setMobileOpen(false)} />)}
          </div>
          <p className="px-3 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#718791]">Operations</p>
          <div className="space-y-1">
            {operations.map((item) => <NavItem key={item.href} item={item} active={pathname === item.href} closeMenu={() => setMobileOpen(false)} />)}
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#a9bac0] transition hover:bg-white/8 hover:text-white">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6ebe8] text-xs font-bold text-[#236b67]">AS</span>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">Analyst session</p><p className="truncate text-[11px] text-[#7f969e]">Local workspace</p></div>
            <ChevronDown className="h-4 w-4 text-[#718791]" />
          </div>
        </div>
      </aside>

      {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-[#071015]/50 lg:hidden" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#dbe2e8] bg-[#f8fafb]/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3"><button type="button" className="rounded-md p-2 text-[#51636d] hover:bg-white lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button><div className="hidden items-center gap-2 text-sm text-[#6e8089] sm:flex"><Database className="h-4 w-4" /><span>Local data source</span><span className="h-1 w-1 rounded-full bg-[#4c9d95]" /><span className="text-[#367c75]">Connected</span></div></div>
          <div className="flex items-center gap-3"><button type="button" className="hidden h-9 items-center gap-2 rounded-md border border-[#d8e0e5] bg-white px-3 text-xs font-medium text-[#556974] shadow-sm transition hover:border-[#b7c8cf] sm:flex"><Search className="h-3.5 w-3.5" />Search events<span className="ml-3 rounded border border-[#e4e9ec] px-1.5 py-0.5 text-[10px] text-[#8ca0a8]">⌘ K</span></button><button type="button" className="relative rounded-md p-2 text-[#5d707a] hover:bg-white" aria-label="Notifications"><AlertTriangle className="h-[18px] w-[18px]" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#d26b57]" /></button></div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}

function NavItem({ item, active, closeMenu }: { item: { label: string; href: string; icon: typeof Activity; count?: number }; active: boolean; closeMenu: () => void }) {
  const Icon = item.icon
  return <Link href={item.href} onClick={closeMenu} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${active ? 'bg-[#214048] font-medium text-white shadow-sm' : 'text-[#9db0b7] hover:bg-white/8 hover:text-white'}`}><Icon className={`h-[17px] w-[17px] ${active ? 'text-[#78c6bd]' : 'text-[#78919a] group-hover:text-[#b5c8cd]'}`} /><span className="flex-1">{item.label}</span>{item.count && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-[#326b6b] text-[#c6eeea]' : 'bg-[#273942] text-[#91a9b0]'}`}>{item.count}</span>}</Link>
}

export function PageHeading({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 border-b border-[#dbe2e8] pb-6 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a8b8d]">{eyebrow}</p>}<h1 className="text-[25px] font-semibold tracking-[-0.03em] text-[#1d2c35]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-sm text-[#71828b]">{description}</p>}</div>{children}</div>
}

export function EmptyModule({ icon: Icon, title, description }: { icon: typeof Database; title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-[#cbd8de] bg-white/70 px-6 py-12 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f2f1] text-[#39847d]"><Icon className="h-5 w-5" /></span><h2 className="mt-4 text-sm font-semibold text-[#354751]">{title}</h2><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#7d8e96]">{description}</p></div>
}

export const shellNav = [...navigation, ...operations]

