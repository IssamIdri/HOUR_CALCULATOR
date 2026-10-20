import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../domain/ledger.ts'
import { monthlySeries, weeklySeries } from '../domain/ledger.ts'
import { formatDuration } from '../domain/time.ts'
import { formatMoney } from '../domain/money.ts'
import type { Shift, WeekStartsOn } from '../domain/types.ts'
import { cn } from '../lib/cn.ts'

export function HoursChart({ shifts, weekStartsOn }: { shifts: Shift[]; weekStartsOn: WeekStartsOn }) {
  const [granularity, setGranularity] = useState<'week' | 'month'>('week')
  const data = granularity === 'week' ? weeklySeries(shifts, weekStartsOn) : monthlySeries(shifts)
  const empty = data.every((point) => point.minutes === 0 && point.earnedCents === 0)

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Heures et revenus</h2>
          <p className="text-sm text-slate-500">Le survol indique la durée exacte en heures et minutes.</p>
        </div>
        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
          <button type="button" className={cn('rounded-xl px-3 py-1.5 font-medium', granularity === 'week' ? 'bg-white shadow-sm' : 'text-slate-500')} onClick={() => setGranularity('week')}>
            Semaine
          </button>
          <button type="button" className={cn('rounded-xl px-3 py-1.5 font-medium', granularity === 'month' ? 'bg-white shadow-sm' : 'text-slate-500')} onClick={() => setGranularity('month')}>
            Mois
          </button>
        </div>
      </div>
      <div className="relative mt-4 h-72 min-w-0">
        {empty ? <p className="absolute inset-x-0 top-8 text-center text-sm text-slate-400">Aucune heure sur cette période.</p> : null}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="hours" tickFormatter={formatAxisHours} width={48} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="money" orientation="right" tickFormatter={formatAxisMoney} width={64} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar yAxisId="hours" dataKey="minutes" name="Heures" fill="#0f766e" radius={[8, 8, 0, 0]} maxBarSize={28} />
            <Line yAxisId="money" dataKey="earnedCents" name="Revenus" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: ChartPoint }> }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white shadow-xl">
      <p className="font-semibold">{point.label}</p>
      <p className="mt-1 text-teal-100">{formatDuration(point.minutes)}</p>
      <p>{formatMoney(point.earnedCents)}</p>
    </div>
  )
}

function formatAxisHours(minutes: number): string {
  const hours = minutes / 60
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: hours < 10 ? 1 : 0 }).format(hours)} h`
}

function formatAxisMoney(cents: number): string {
  const euros = cents / 100
  if (Math.abs(euros) >= 1000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(euros / 1000)} k€`
  }
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(euros)} €`
}
