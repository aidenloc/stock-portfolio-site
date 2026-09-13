'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import StockChart from './StockChart'

const PERIODS = ['1D', '1W', '1M', '6M', 'YTD', '1Y'] as const
type Period = (typeof PERIODS)[number]
const INTRADAY_PERIODS: Period[] = ['1D', '1W']

// Validated categorical palette (dark-surface steps) from the site's dataviz
// guidelines — fixed hue order, assigned by entity identity, never by sort rank.
const CATEGORICAL_COLORS = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
]
const OTHER_COLOR = '#6b6b68'
const MAX_EXPOSURE_SLICES = 7

type Holding = {
  id: number
  ticker: string
  shares: number
  entryPrice: number
  entryDate: string
  sector: string | null
  currentPrice: number
  currentValue: number
  gainDollar: number
  gainPct: number
}

type SeriesPoint = {
  time: number
  portfolioValue: number
  spyPrice: number | null
  portfolioReturnPct: number
  spyReturnPct: number | null
}

type Performance = {
  holdings: Holding[]
  series: SeriesPoint[]
  totalValue: number
  totalCost: number
  totalReturnPct: number
}

type ExposureSlice = { label: string; value: number; pct: number; color: string }

// Groups holdings by keyFn (ticker or sector), sorts largest-first for display,
// and folds anything past the token ceiling into "Other". Color is assigned by
// each entity's first-seen order in `holdings` (stable identity), not by its
// sorted display rank, so a ticker doesn't change color as prices move it around.
function buildExposure(holdings: Holding[], keyFn: (h: Holding) => string): ExposureSlice[] {
  const identityOrder: string[] = []
  const totals = new Map<string, number>()
  for (const h of holdings) {
    const key = keyFn(h)
    if (!totals.has(key)) identityOrder.push(key)
    totals.set(key, (totals.get(key) ?? 0) + h.currentValue)
  }
  const total = Array.from(totals.values()).reduce((a, b) => a + b, 0)

  const colorByKey = new Map<string, string>()
  identityOrder.forEach((key, i) => colorByKey.set(key, CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]))

  const sorted = Array.from(totals.entries())
    .map(([label, value]) => ({ label, value, pct: total > 0 ? (value / total) * 100 : 0, color: colorByKey.get(label)! }))
    .sort((a, b) => b.value - a.value)

  if (sorted.length <= MAX_EXPOSURE_SLICES) return sorted

  const top = sorted.slice(0, MAX_EXPOSURE_SLICES)
  const restValue = sorted.slice(MAX_EXPOSURE_SLICES).reduce((sum, s) => sum + s.value, 0)
  top.push({ label: 'Other', value: restValue, pct: total > 0 ? (restValue / total) * 100 : 0, color: OTHER_COLOR })
  return top
}

// Small colored pill for a signed %/$ delta — Finary-style badge rather than plain colored text.
function GainBadge({ value, size = 'sm', children }: { value: number; size?: 'sm' | 'md'; children: React.ReactNode }) {
  const up = value >= 0
  const sizeClasses = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${
        up ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      }`}
    >
      {children}
    </span>
  )
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-[var(--color-card)] rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1.25rem)] ${className}`}>
      {children}
    </div>
  )
}

function ExposureBar({ title, slices }: { title: string; slices: ExposureSlice[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">{title}</p>
      <div className="flex gap-[2px] h-7 rounded-[var(--border-radius)] overflow-hidden mb-3">
        {slices.map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.label}: ${s.pct.toFixed(1)}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
        {slices.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} ({s.pct.toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  )
}

function formatLabel(timestamp: number, period: Period): string {
  const date = new Date(timestamp * 1000)
  if (INTRADAY_PERIODS.includes(period)) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function PaperPortfolio() {
  const [period, setPeriod] = useState<Period>('1M')
  const [data, setData] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBenchmark, setShowBenchmark] = useState(true)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const fetchPerformance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/paper-portfolio/performance?period=${period}`)
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchPerformance()
  }, [fetchPerformance])

  if (!data && loading) return null
  if (!data || !data.holdings || data.holdings.length === 0) return null

  const periodReturnPct = data.series.length ? data.series[data.series.length - 1].portfolioReturnPct : 0
  const periodDollarChange =
    data.series.length > 1 ? data.series[data.series.length - 1].portfolioValue - data.series[0].portfolioValue : 0
  const periodUp = periodDollarChange >= 0

  const exposureByHolding = buildExposure(data.holdings, (h) => h.ticker)
  const exposureBySector = buildExposure(data.holdings, (h) => h.sector || 'Unknown')

  return (
    <section className="mb-[calc(var(--spacing-unit)*3rem)]">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Paper Portfolio</p>
      <h1 className="text-5xl sm:text-6xl font-bold tabular-nums leading-none mb-2">
        ${data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </h1>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className={`text-sm font-medium ${periodUp ? 'text-green-400' : 'text-red-400'}`}>
          {periodUp ? '+' : '-'}${Math.abs(periodDollarChange).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <GainBadge value={periodReturnPct} size="md">
          {periodReturnPct >= 0 ? '+' : ''}
          {periodReturnPct.toFixed(2)}% · {period}
        </GainBadge>
      </div>
      <p className="text-xs text-gray-500 mb-8">Simulated portfolio, tracked for performance only — not real money.</p>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex bg-[var(--color-bg)] rounded-full p-1 gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  period === p ? 'bg-[var(--color-primary)] text-white' : 'text-gray-400 hover:text-[var(--color-text)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowBenchmark((v) => !v)}
            className={`ml-auto px-3 py-1 rounded-full text-sm border transition-colors ${
              showBenchmark ? 'border-[var(--color-text)]/40' : 'border-[var(--color-text)]/10 text-gray-500'
            }`}
          >
            S&amp;P 500
          </button>
        </div>

        <div className="h-72">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.series}>
                <defs>
                  <linearGradient id="portfolioGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 0.3 }} />
                    <stop offset="95%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#333" vertical={false} />
                <XAxis dataKey="time" tickFormatter={(t) => formatLabel(t, period)} stroke="#888" minTickGap={40} />
                <YAxis domain={['auto', 'auto']} stroke="#888" width={60} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  labelFormatter={(t) => formatLabel(Number(t), period)}
                  formatter={(value: any, name: any, entry: any) => {
                    const point = entry?.payload as SeriesPoint | undefined
                    const pct = `${Number(value).toFixed(2)}%`
                    if (name === 'Portfolio') {
                      const dollar = point ? `$${point.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''
                      return [`${pct} (${dollar})`, name]
                    }
                    const spyPrice = point?.spyPrice
                    return [spyPrice ? `${pct} ($${spyPrice.toFixed(2)})` : pct, name]
                  }}
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #444' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="portfolioReturnPct"
                  name="Portfolio"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#portfolioGlow)"
                  dot={false}
                />
                {showBenchmark && (
                  <Line
                    type="monotone"
                    dataKey="spyReturnPct"
                    name="S&P 500 (SPY)"
                    stroke="#888"
                    dot={false}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <Card>
          <ExposureBar title="Market exposure by holding" slices={exposureByHolding} />
        </Card>
        <Card>
          <ExposureBar title="Market exposure by sector" slices={exposureBySector} />
        </Card>
      </div>

      <Card className="p-[calc(var(--spacing-unit)*0.5rem)] sm:p-[calc(var(--spacing-unit)*0.75rem)]">
        <p className="text-xs uppercase tracking-wide text-gray-500 px-4 pt-3 pb-2">Holdings</p>
        <div>
          {data.holdings.map((h) => (
            <div
              key={h.id}
              onClick={() => setSelectedTicker(h.ticker)}
              className="flex items-center justify-between px-4 py-3 rounded-[var(--border-radius)] cursor-pointer hover:bg-[var(--color-text)]/5 transition-colors"
            >
              <div>
                <p className="font-semibold">{h.ticker}</p>
                <p className="text-xs text-gray-500">{h.shares} shares</p>
              </div>
              <div className="text-right">
                <p className="font-medium tabular-nums">${h.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <GainBadge value={h.gainDollar}>
                  {h.gainDollar >= 0 ? '+' : ''}${h.gainDollar.toFixed(2)} ({h.gainDollar >= 0 ? '+' : ''}
                  {h.gainPct.toFixed(2)}%)
                </GainBadge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedTicker && <StockChart ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />}
    </section>
  )
}
