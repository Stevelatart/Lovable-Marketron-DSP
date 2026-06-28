import { db } from '@/lib/db'
import { advertisers, permissions, users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { format } from 'date-fns'
import { AddAdvertiserButton } from '@/components/admin/AddAdvertiserButton'

export default async function AdvertisersPage() {
  const advList = await db.select({
    id: advertisers.id,
    name: advertisers.name,
    email: users.email,
    emailKeyword: advertisers.emailKeyword,
    lastReportAt: advertisers.lastReportAt,
    kpis: permissions.kpis,
    supply: permissions.supply,
    audience: permissions.audience,
    tactics: permissions.tactics,
  })
    .from(advertisers)
    .leftJoin(users, eq(advertisers.userId, users.id))
    .leftJoin(permissions, eq(permissions.advertiserId, advertisers.id))
    .orderBy(advertisers.createdAt)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Advertisers</h1>
          <p className="text-slate-500 text-sm mt-1">{advList.length} accounts</p>
        </div>
        <AddAdvertiserButton />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Advertiser', 'Login Email', 'Permissions', 'Email Keyword', 'Last Report', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {advList.map(adv => (
              <tr key={adv.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium text-slate-900">{adv.name}</td>
                <td className="px-5 py-4 text-slate-600">{adv.email}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    {(['kpis', 'supply', 'audience', 'tactics'] as const).map(key => (
                      <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${adv[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {key === 'kpis' ? 'KPIs' : key === 'supply' ? 'Supply' : key === 'audience' ? 'Audience' : 'Tactics'}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500 text-xs font-mono">{adv.emailKeyword || <span className="text-slate-300">—</span>}</td>
                <td className="px-5 py-4 text-slate-500 text-xs">{adv.lastReportAt ? format(adv.lastReportAt, 'MMM d, yyyy') : <span className="text-slate-300">Never</span>}</td>
                <td className="px-5 py-4">
                  <Link href={`/admin/advertisers/${adv.id}`} className="btn-primary text-xs py-1.5">Permissions</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
