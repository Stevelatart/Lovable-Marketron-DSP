import { db } from '@/lib/db'
import { advertisers, permissions, users, kpiSnapshots } from '@/lib/schema'
import { eq, gte, sum } from 'drizzle-orm'
import Link from 'next/link'
import { Users, BarChart2, RefreshCw } from 'lucide-react'
import { subDays } from 'date-fns'

export default async function AdminOverviewPage() {
  const since = subDays(new Date(), 30)

  const advList = await db.select({
    id: advertisers.id,
    name: advertisers.name,
    email: users.email,
    kpis: permissions.kpis,
    supply: permissions.supply,
    audience: permissions.audience,
    tactics: permissions.tactics,
  })
    .from(advertisers)
    .leftJoin(users, eq(advertisers.userId, users.id))
    .leftJoin(permissions, eq(permissions.advertiserId, advertisers.id))
    .orderBy(advertisers.createdAt)

  const [spendRow] = await db.select({ total: sum(kpiSnapshots.spend) })
    .from(kpiSnapshots).where(gte(kpiSnapshots.date, since))
  const [impRow] = await db.select({ total: sum(kpiSnapshots.impressions) })
    .from(kpiSnapshots).where(gte(kpiSnapshots.date, since))

  const totalSpend = Number(spendRow?.total ?? 0)
  const totalImpressions = Number(impRow?.total ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Manage advertisers and platform data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-50 rounded-lg"><Users className="w-4 h-4 text-brand-600" /></div>
            <p className="text-sm text-slate-600">Total Advertisers</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{advList.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><BarChart2 className="w-4 h-4 text-emerald-600" /></div>
            <p className="text-sm text-slate-600">30-day Spend (all)</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalSpend)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg"><RefreshCw className="w-4 h-4 text-blue-600" /></div>
            <p className="text-sm text-slate-600">30-day Impressions (all)</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{(totalImpressions / 1_000_000).toFixed(1)}M</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Advertisers</p>
          <Link href="/admin/advertisers" className="btn-primary text-xs py-1.5">Manage All</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {advList.map(adv => (
            <div key={adv.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900 text-sm">{adv.name}</p>
                <p className="text-xs text-slate-500">{adv.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {(['kpis', 'supply', 'audience', 'tactics'] as const).map(key => (
                    <span key={key} className={`text-xs px-1.5 py-0.5 rounded font-medium ${adv[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {key === 'kpis' ? 'KPI' : key === 'supply' ? 'SUP' : key === 'audience' ? 'AUD' : 'TAC'}
                    </span>
                  ))}
                </div>
                <Link href={`/admin/advertisers/${adv.id}`} className="btn-ghost text-xs py-1.5 px-3">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
