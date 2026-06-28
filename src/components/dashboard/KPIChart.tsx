'use client'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { format } from 'date-fns'

type Point = { date: string; impressions: number; spend: number; roas: number }

export function KPIChart({ data }: { data: Point[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-700 mb-4">Daily Performance (30 days)</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => format(new Date(d), 'MMM d')} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(1)}x`} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'Spend') return [`$${Number(value).toLocaleString()}`, name]
              if (name === 'ROAS') return [`${Number(value).toFixed(2)}x`, name]
              return [Number(value).toLocaleString(), name]
            }}
            labelFormatter={d => format(new Date(d), 'MMM d, yyyy')}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#6366f1" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
