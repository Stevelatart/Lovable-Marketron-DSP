import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { permissions, kpiSnapshots } from '@/lib/schema'
import { eq, and, gte, desc } from 'drizzle-orm'
import { subDays } from 'date-fns'
import { KPIChart } from '@/components/dashboard/KPIChart'
import { TrendingUp, DollarSign, MousePointer, Eye, ShoppingCart, BarChart } from 'lucide-react'

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default async function KPIPage() {
  const session = await getServerSession(authOptions)
  const advertiserId = session?.user.advertiserId
  if (!advertiserId) redirect('/login')

  const [permission] = await db.select().from(permissions).where(eq(permissions.advertiserId, advertiserId)).limit(1)
  if (!permission?.kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">You don&apos;t have access to KPI data. Contact your account manager.</p>
      </div>
    )
  }

  const since = subDays(new Date(), 30)
  since.setHours(0, 0, 0, 0)

  const rows = await db.select().from(kpiSnapshots)
    .where(and(eq(kpiSnapshots.advertiserId, advertiserId), gte(kpiSnapshots.date, since)))
    .orderBy(kpiSnapshots.date)

  const totals = rows.reduce(
    (a, r) => ({ impressions: a.impressions + r.impressions, clicks: a.clicks + r.clicks, spend: a.spend + r.spend, revenue: a.revenue + r.revenue, conversions: a.conversions + r.conversions }),
    { impressions: 0, clicks: 0, spend: 0, revenue: 0, conversions: 0 },
  )

  const avgRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

  const chartData = rows.map(r => ({ date: r.date.toISOString(), impressions: r.impressions, spend: r.spend, roas: r.roas }))

  const stats = [
    { label: 'Total Spend', value: fmtUSD(totals.spend), icon: DollarSign, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'ROAS', value: `${avgRoas.toFixed(2)}x`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Impressions', value: (totals.impressions / 1_000_000).toFixed(1) + 'M', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Clicks', value: totals.clicks.toLocaleString(), icon: MousePointer, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'CTR', value: `${avgCtr.toFixed(2)}%`, icon: BarChart, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Conversions', value: totals.conversions.toLocaleString(), icon: ShoppingCart, color: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Campaign KPIs</h1>
        <p className="text-slate-500 text-sm mt-1">Last 30 days · {session.user.advertiserName}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <KPIChart data={chartData} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Daily Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Impressions', 'Clicks', 'CTR', 'Spend', 'eCPM', 'CPC', 'ROAS', 'Conv.'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...rows].reverse().slice(0, 14).map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-4 py-3 text-slate-600">{r.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{r.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{r.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-slate-600">{fmtUSD(r.spend)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtUSD(r.cpm)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtUSD(r.cpc)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${r.roas >= 2 ? 'text-emerald-600' : r.roas >= 1 ? 'text-amber-600' : 'text-red-500'}`}>{r.roas.toFixed(2)}x</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
