'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceArea,
} from 'recharts'
import { formatFullDate, recessionsInRange, SERIES_COLORS, type MergedPoint, type TimeAxis } from '@/lib/macro'

const SERIES: { key: 'DGS3MO' | 'DGS2' | 'DGS10'; name: string }[] = [
  { key: 'DGS3MO', name: '3-Month' },
  { key: 'DGS2', name: '2-Year' },
  { key: 'DGS10', name: '10-Year' },
]

function YieldTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number }[]
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="w-max bg-[var(--color-bg)]/95 backdrop-blur-sm border border-[var(--color-primary)]/20 rounded-[var(--border-radius)] px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--color-text)]/60 mb-1.5">{formatFullDate(Number(label))}</p>
      <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 items-baseline">
        {payload
          .filter((p) => typeof p.value === 'number')
          .map((p) => (
            <p key={p.name} className="contents">
              <span className="text-[var(--color-text)]/60">{p.name}</span>
              <span className="tabular-nums text-right font-medium">{p.value!.toFixed(2)}%</span>
            </p>
          ))}
      </div>
    </div>
  )
}

export default function YieldCurveChart({
  data,
  domain,
  axis,
}: {
  data: MergedPoint[]
  domain: [number, number]
  axis: TimeAxis
}) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--color-text)]/60 py-8 text-center">No Treasury yield data cached yet.</p>
  }

  const bands = recessionsInRange(domain[0], domain[1])

  const latest = data[data.length - 1]
  const summary = SERIES.map((s) => `${s.name} ${typeof latest[s.key] === 'number' ? `${(latest[s.key] as number).toFixed(2)}%` : 'n/a'}`).join(
    ', '
  )

  return (
    <div className="h-80">
      <p className="sr-only">{`Line chart of Treasury yields. Latest: ${summary}. Shaded bands mark US recessions.`}</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#332f2a" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={domain}
            ticks={axis.ticks}
            tickFormatter={axis.formatTick}
            stroke="#8c8479"
          />
          <YAxis domain={['auto', 'auto']} stroke="#8c8479" width={48} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<YieldTooltip />} />
          <Legend />
          {bands.map((b) => (
            <ReferenceArea key={b.start} x1={b.start} x2={b.end} fill="var(--color-text)" fillOpacity={0.06} stroke="none" />
          ))}
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={SERIES_COLORS[s.key]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
