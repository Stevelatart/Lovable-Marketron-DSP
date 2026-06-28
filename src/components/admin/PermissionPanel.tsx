'use client'
import { useState } from 'react'
import { BarChart2, Layers, Users, Zap } from 'lucide-react'
import { clsx } from 'clsx'

type Perms = { kpis: boolean; supply: boolean; audience: boolean; tactics: boolean }

const SECTIONS = [
  {
    key: 'kpis' as const,
    label: 'KPIs',
    desc: 'Impressions, clicks, CTR, ROAS, CPC, eCPM, conversions',
    icon: BarChart2,
  },
  {
    key: 'supply' as const,
    label: 'Supply & Inventory',
    desc: 'Supply source breakdown, win rates, floor prices, inventory mix',
    icon: Layers,
  },
  {
    key: 'audience' as const,
    label: 'Audience',
    desc: 'Segment performance, reach, frequency, in-market vs. lifestyle',
    icon: Users,
  },
  {
    key: 'tactics' as const,
    label: 'Tactic Performance',
    desc: 'Order line level metrics, ROAS by tactic, attributed orders',
    icon: Zap,
  },
]

export function PermissionPanel({ advertiserId, initial }: { advertiserId: string; initial: Perms }) {
  const [perms, setPerms] = useState<Perms>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function toggle(key: keyof Perms) {
    const newVal = !perms[key]
    setSaving(key)
    setPerms(p => ({ ...p, [key]: newVal }))
    try {
      await fetch(`/api/advertisers/${advertiserId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      })
      setSaved(key)
      setTimeout(() => setSaved(null), 1500)
    } catch {
      setPerms(p => ({ ...p, [key]: !newVal }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map(({ key, label, desc, icon: Icon }) => (
        <div
          key={key}
          className={clsx(
            'flex items-center justify-between p-4 rounded-xl border transition-all',
            perms[key] ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white',
          )}
        >
          <div className="flex items-center gap-3">
            <div className={clsx('p-2 rounded-lg', perms[key] ? 'bg-brand-100' : 'bg-slate-100')}>
              <Icon className={clsx('w-4 h-4', perms[key] ? 'text-brand-600' : 'text-slate-400')} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {saved === key && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
            <button
              onClick={() => toggle(key)}
              disabled={saving === key}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                perms[key] ? 'bg-brand-500' : 'bg-slate-200',
                saving === key && 'opacity-50',
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  perms[key] ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
