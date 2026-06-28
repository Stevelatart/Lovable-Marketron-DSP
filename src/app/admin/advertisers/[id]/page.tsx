import { db } from '@/lib/db'
import { advertisers, permissions, users, kpiSnapshots } from '@/lib/schema'
import { eq, and, gte, count, sum } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PermissionPanel } from '@/components/admin/PermissionPanel'
import { EmailKeywordForm } from '@/components/admin/EmailKeywordForm'
import { subDays } from 'date-fns'

export default async function AdvertiserDetailPage({ params }: { params: { id: string } }) {
  const [adv] = await db.select({
    id: advertisers.id,
    name: advertisers.name,
    email: users.email,
    emailKeyword: advertisers.emailKeyword,
    dspAccountId: advertisers.dspAccountId,
    kpis: permissions.kpis,
    supply: permissions.supply,
    audience: permissions.audience,
    tactics: permissions.tactics,
  })
    .from(advertisers)
    .leftJoin(users, eq(advertisers.userId, users.id))
    .leftJoin(permissions, eq(permissions.advertiserId, advertisers.id))
    .where(eq(advertisers.id, params.id))
    .limit(1)

  if (!adv) notFound()

  const since = subDays(new Date(), 30)

  const [countRow] = await db.select({ n: count() }).from(kpiSnapshots)
    .where(and(eq(kpiSnapshots.advertiserId, params.id), gte(kpiSnapshots.date, since)))
  const [spendRow] = await db.select({ total: sum(kpiSnapshots.spend) }).from(kpiSnapshots)
    .where(and(eq(kpiSnapshots.advertiserId, params.id), gte(kpiSnapshots.date, since)))
  const lastKpiRows = await db.select({ date: kpiSnapshots.date }).from(kpiSnapshots)
    .where(eq(kpiSnapshots.advertiserId, params.id))
    .orderBy(kpiSnapshots.date)
    .limit(1)
  const lastDate = lastKpiRows[0]?.date

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/admin/advertisers" className="btn-ghost text-sm px-0 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to advertisers
        </Link>
        <h1 className="page-title">{adv.name}</h1>
        <p className="text-slate-500 text-sm mt-1">{adv.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">30-day Data Points</p>
          <p className="text-2xl font-bold text-slate-900">{countRow?.n ?? 0}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">30-day Spend</p>
          <p className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(spendRow?.total ?? 0))}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500 mb-1">Last Report Date</p>
          <p className="text-2xl font-bold text-slate-900">
            {lastDate ? lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Data Access Permissions</h2>
        <p className="text-sm text-slate-500 mb-5">Toggle which sections this advertiser can see in their dashboard.</p>
        <PermissionPanel
          advertiserId={params.id}
          initial={{ kpis: adv.kpis ?? true, supply: adv.supply ?? false, audience: adv.audience ?? false, tactics: adv.tactics ?? true }}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Email Report Matching</h2>
        <p className="text-sm text-slate-500 mb-5">
          The keyword used to match incoming Amazon DSP report emails to this advertiser.
        </p>
        <EmailKeywordForm advertiserId={params.id} initial={adv.emailKeyword ?? ''} dspAccountId={adv.dspAccountId ?? ''} />
      </div>
    </div>
  )
}
