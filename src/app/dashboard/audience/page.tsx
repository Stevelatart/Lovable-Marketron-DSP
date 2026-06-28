import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { permissions, audienceSnapshots } from '@/lib/schema'
import { eq, and, gte } from 'drizzle-orm'
import { subDays } from 'date-fns'
import { AudiencePieChart } from '@/components/dashboard/AudiencePieChart'

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const typeColors: Record<string, string> = {
  'In-Market': 'bg-brand-100 text-brand-700',
  'Lifestyle': 'bg-emerald-100 text-emerald-700',
  'Contextual': 'bg-amber-100 text-amber-700',
  'Retargeting': 'bg-rose-100 text-rose-700',
}

export default async function AudiencePage() {
  const session = await getServerSession(authOptions)
  const advertiserId = session?.user.advertiserId
  if (!advertiserId) redirect('/login')

  const [permission] = await db.select().from(permissions).where(eq(permissions.advertiserId, advertiserId)).limit(1)
  if (!permission?.audience) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">You don&apos;t have access to audience data. Contact your account manager.</p>
      </div>
    )
  }

  const since = subDays(new Date(), 30)
  since.setHours(0, 0, 0, 0)

  const rows = await db.select().from(audienceSnapshots)
    .where(and(eq(audienceSnapshots.advertiserId, advertiserId), gte(audienceSnapshots.date, since)))

  const bySegment = rows.reduce<Record<string, { type: string; impressions: number; reach: number; freqSum: number; spend: number; count: number }>>((a, r) => {
    if (!a[r.segmentName]) a[r.segmentName] = { type: r.segmentType, impressions: 0, reach: 0, freqSum: 0, spend: 0, count: 0 }
    a[r.segmentName].impressions += r.impressions
    a[r.segmentName].reach += r.uniqueReach
    a[r.segmentName].freqSum += r.frequency
    a[r.segmentName].spend += r.spend
    a[r.segmentName].count++
    return a
  }, {})

  const segments = Object.entries(bySegment)
    .map(([name, v]) => ({ name, type: v.type, impressions: v.impressions, reach: v.reach, avgFrequency: v.freqSum / v.count, spend: v.spend }))
    .sort((a, b) => b.impressions - a.impressions)

  const byType = segments.reduce<Record<string, number>>((a, s) => { a[s.type] = (a[s.type] ?? 0) + s.impressions; return a }, {})
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Audience</h1>
        <p className="text-slate-500 text-sm mt-1">Last 30 days · {session.user.advertiserName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Unique Reach</p>
          <p className="text-3xl font-bold text-slate-900">{(segments.reduce((a, s) => a + s.reach, 0) / 1000).toFixed(0)}K</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Audience Segments</p>
          <p className="text-3xl font-bold text-slate-900">{segments.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Avg Frequency</p>
          <p className="text-3xl font-bold text-slate-900">{(segments.reduce((a, s) => a + s.avgFrequency, 0) / segments.length).toFixed(1)}x</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AudiencePieChart data={pieData} />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Top Segments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Segment', 'Type', 'Impressions', 'Reach', 'Freq', 'Spend'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {segments.map(s => (
                  <tr key={s.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px] truncate">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[s.type] ?? 'bg-slate-100 text-slate-600'}`}>{s.type}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{(s.reach / 1000).toFixed(0)}K</td>
                    <td className="px-4 py-3 text-slate-600">{s.avgFrequency.toFixed(1)}x</td>
                    <td className="px-4 py-3 text-slate-600">{fmtUSD(s.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
