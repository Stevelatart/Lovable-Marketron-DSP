import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { permissions, supplySnapshots } from '@/lib/schema'
import { eq, and, gte } from 'drizzle-orm'
import { subDays } from 'date-fns'
import { SupplyChart } from '@/components/dashboard/SupplyChart'

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default async function SupplyPage() {
  const session = await getServerSession(authOptions)
  const advertiserId = session?.user.advertiserId
  if (!advertiserId) redirect('/login')

  const [permission] = await db.select().from(permissions).where(eq(permissions.advertiserId, advertiserId)).limit(1)
  if (!permission?.supply) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">You don&apos;t have access to supply data. Contact your account manager.</p>
      </div>
    )
  }

  const since = subDays(new Date(), 30)
  since.setHours(0, 0, 0, 0)

  const rows = await db.select().from(supplySnapshots)
    .where(and(eq(supplySnapshots.advertiserId, advertiserId), gte(supplySnapshots.date, since)))

  const bySource = rows.reduce<Record<string, { impressions: number; spend: number; winRateSum: number; count: number; floorPriceSum: number }>>((a, r) => {
    if (!a[r.source]) a[r.source] = { impressions: 0, spend: 0, winRateSum: 0, count: 0, floorPriceSum: 0 }
    a[r.source].impressions += r.impressions
    a[r.source].spend += r.spend
    a[r.source].winRateSum += r.winRate
    a[r.source].floorPriceSum += r.floorPrice
    a[r.source].count++
    return a
  }, {})

  const sourceSummary = Object.entries(bySource)
    .map(([source, v]) => ({ source, impressions: v.impressions, spend: v.spend, avgWinRate: v.winRateSum / v.count, avgFloorPrice: v.floorPriceSum / v.count }))
    .sort((a, b) => b.spend - a.spend)

  const chartData = sourceSummary.map(s => ({ source: s.source, spend: Math.round(s.spend), impressions: s.impressions }))
  const totalSpend = sourceSummary.reduce((a, s) => a + s.spend, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Supply & Inventory</h1>
        <p className="text-slate-500 text-sm mt-1">Last 30 days · {session.user.advertiserName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Total Supply Sources</p>
          <p className="text-3xl font-bold text-slate-900">{sourceSummary.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Total Impressions Won</p>
          <p className="text-3xl font-bold text-slate-900">{(rows.reduce((a, r) => a + r.impressions, 0) / 1_000_000).toFixed(1)}M</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Avg Win Rate</p>
          <p className="text-3xl font-bold text-slate-900">{(rows.reduce((a, r) => a + r.winRate, 0) / rows.length).toFixed(1)}%</p>
        </div>
      </div>

      <SupplyChart data={chartData} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Supply Source Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Supply Source', 'Impressions', 'Spend', 'Avg Win Rate', 'Avg Floor Price', 'Share of Spend'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sourceSummary.map(s => (
                <tr key={s.source} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.source}</td>
                  <td className="px-4 py-3 text-slate-600">{s.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtUSD(s.spend)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${Math.min(s.avgWinRate, 100)}%` }} />
                      </div>
                      <span className="text-slate-600 w-12 text-right">{s.avgWinRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">${s.avgFloorPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{totalSpend > 0 ? ((s.spend / totalSpend) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
