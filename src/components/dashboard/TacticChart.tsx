'use client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

type Props = { data: { name: string; roas: number; spend: number }[] }

export function TacticChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-700 mb-4">ROAS by Tactic</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 140, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}x`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
          <Tooltip formatter={(v: number) => [`${v}x`, 'ROAS']} />
          <Bar dataKey="roas" name="ROAS" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
