import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { permissions, tacticSnapshots } from '@/lib/schema'
import { eq, and, gte } from 'drizzle-orm'
import { subDays } from 'date-fns'
import { TacticChart } from '@/components/dashboard/TacticChart'

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default async function TacticsPage() {
  const session = await getServerSession(authOptions)
  const advertiserId = session?.user.advertiserId
  if (!advertiserId) redirect('/login')

  const [permission] = await db.select().from(permissions).where(eq(permissions.advertiserId, advertiserId)).limit(1)
  if (!permission?.tactics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">You don&apos;t have access to tactic data. Contact your account manager.</p>
      </div>
    )
  }

  const since = subDays(new Date(), 30)
  since.setHours(0, 0, 0, 0)

  const rows = await db.select().from(tacticSnapshots)
    .where(and(eq(tacticSnapshots.advertiserId, advertiserId), gte(tacticSnapshots.date, since)))

  const byTactic = rows.reduce<Record<string, { order: string; impressions: number; clicks: number; spend: number; revenue: number; orders: number }>>((a, r) => {
    const key = `${r.orderName}||${r.tacticName}`
    if (!a[key]) a[key] = { order: r.orderName, impressions: 0, clicks: 0, spend: 0, revenue: 0, orders: 0 }
    a[key].impressions += r.impressions
    a[key].clicks += r.clicks
    a[key].spend += r.spend
    a[key].revenue += r.revenue
    a[key].orders += r.orders
    return a
  }, {})

  const tactics = Object.entries(byTactic)
    .map(([key, v]) => ({ tactic: key.split('||')[1], order: v.order, impressions: v.impressions, clicks: v.clicks, spend: v.spend, roas: v.spend > 0 ? v.revenue / v.spend : 0, orders: v.orders, revenue: v.revenue }))
    .sort((a, b) => b.spend - a.spend)

  const chartData = tactics.map(t => ({ name: t.tactic, roas: parseFloat(t.roas.toFixed(2)), spend: Math.round(t.spend) }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Tactic Performance</h1>
        <p className="text-slate-500 text-sm mt-1">Last 30 days · {session.user.advertiserName}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Total Tactics</p>
          <p className="text-3xl font-bold text-slate-900">{tactics.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Total Spend</p>
          <p className="text-3xl font-bold text-slate-900">{fmtUSD(tactics.reduce((a, t) => a + t.spend, 0))}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-slate-900">{tactics.reduce((a, t) => a + t.orders, 0).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Avg ROAS</p>
          <p className="text-3xl font-bold text-slate-900">{tactics.length > 0 ? (tactics.reduce((a, t) => a + t.roas, 0) / tactics.length).toFixed(2) : '—'}x</p>
        </div>
      </div>

      <TacticChart data={chartData} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Tactic Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Tactic', 'Order', 'Impressions', 'Clicks', 'Spend', 'ROAS', 'Orders', 'Revenue'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tactics.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.tactic}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.order}</td>
                  <td className="px-4 py-3 text-slate-600">{t.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{t.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtUSD(t.spend)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${t.roas >= 3 ? 'text-emerald-600' : t.roas >= 1.5 ? 'text-amber-600' : 'text-red-500'}`}>{t.roas.toFixed(2)}x</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.orders.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtUSD(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
