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
import { formatAxisDate, formatFullDate, recessionsInRange, SERIES_COLORS, type MergedPoint } from '@/lib/macro'

const SERIES: { key: 'CPI_YOY' | 'FEDFUNDS'; name: string }[] = [
  { key: 'CPI_YOY', name: 'CPI (YoY)' },
  { key: 'FEDFUNDS', name: 'Fed Funds Rate' },
]

function RateTooltip({
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

export default function InflationFedFundsChart({ data }: { data: MergedPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--color-text)]/60 py-8 text-center">No inflation/rate data cached yet.</p>
  }

  const minTime = data[0].time
  const maxTime = data[data.length - 1].time
  const bands = recessionsInRange(minTime, maxTime)

  const latest = data[data.length - 1]
  const summary = SERIES.map((s) => `${s.name} ${typeof latest[s.key] === 'number' ? `${(latest[s.key] as number).toFixed(2)}%` : 'n/a'}`).join(
    ', '
  )

  return (
    <div className="h-80">
      <p className="sr-only">{`Line chart of CPI year-over-year change versus the fed funds rate. Latest: ${summary}. Shaded bands mark US recessions.`}</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#332f2a" vertical={false} />
          <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatAxisDate} stroke="#8c8479" minTickGap={40} />
          <YAxis domain={['auto', 'auto']} stroke="#8c8479" width={48} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<RateTooltip />} />
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
