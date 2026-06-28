'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { BarChart2, Layers, Users, Zap, Settings, LogOut, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

type Permission = {
  kpis: boolean
  supply: boolean
  audience: boolean
  tactics: boolean
}

type Props = {
  advertiserName: string | null
  role: string
  permissions: Permission | null
}

const adminNav = [
  { href: '/admin', label: 'Overview', icon: BarChart2 },
  { href: '/admin/advertisers', label: 'Advertisers', icon: Users },
]

function dashboardNav(p: Permission | null) {
  return [
    { href: '/dashboard', label: 'KPIs', icon: BarChart2, allowed: p?.kpis ?? true },
    { href: '/dashboard/supply', label: 'Supply & Inventory', icon: Layers, allowed: p?.supply ?? false },
    { href: '/dashboard/audience', label: 'Audience', icon: Users, allowed: p?.audience ?? false },
    { href: '/dashboard/tactics', label: 'Tactic Performance', icon: Zap, allowed: p?.tactics ?? true },
  ]
}

export function Sidebar({ advertiserName, role, permissions }: Props) {
  const pathname = usePathname()
  const isAdmin = role === 'ADMIN'
  const nav = isAdmin ? adminNav : dashboardNav(permissions).filter(n => n.allowed)

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-20">
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">Marketron DSP</p>
            <p className="text-slate-400 text-xs truncate">{isAdmin ? 'Admin' : advertiserName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-label px-2 mb-2">{isAdmin ? 'Management' : 'Reports'}</p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4">
              <p className="section-label px-2 mb-2">System</p>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
