'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
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

function ExposureBar({ title, slices }: { title: string; slices: ExposureSlice[] }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">{title}</p>
      <div className="flex gap-[2px] h-6 rounded-[var(--border-radius)] overflow-hidden mb-2">
        {slices.map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.label}: ${s.pct.toFixed(1)}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        {slices.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
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
  const isUp = periodReturnPct >= 0

  const exposureByHolding = buildExposure(data.holdings, (h) => h.ticker)
  const exposureBySector = buildExposure(data.holdings, (h) => h.sector || 'Unknown')

  return (
    <section className="mb-[calc(var(--spacing-unit)*3rem)]">
      <h2 className="text-2xl font-bold mb-1">Paper Portfolio</h2>
      <p className="text-xs text-gray-400 mb-4">Simulated portfolio, tracked for performance only — not real money.</p>

      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-4xl font-bold">
          ${data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className={`text-lg font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          {isUp ? '+' : ''}
          {periodReturnPct.toFixed(2)}% ({period})
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-[var(--border-radius)] text-sm ${
              period === p ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-text)]/10'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setShowBenchmark((v) => !v)}
          className={`ml-auto px-3 py-1 rounded-[var(--border-radius)] text-sm border ${
            showBenchmark ? 'border-[var(--color-text)]/40' : 'border-[var(--color-text)]/10 text-gray-500'
          }`}
        >
          S&amp;P 500
        </button>
      </div>

      <div className="h-72 mb-6 border border-[var(--color-text)]/20 rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1rem)]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
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
              <Line
                type="monotone"
                dataKey="portfolioReturnPct"
                name="Portfolio"
                stroke="var(--color-primary)"
                dot={false}
                strokeWidth={2}
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
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <ExposureBar title="Market exposure by holding" slices={exposureByHolding} />
        <ExposureBar title="Market exposure by sector" slices={exposureBySector} />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-[var(--color-text)]/20">
            <th className="py-1 pr-2">Ticker</th>
            <th className="py-1 pr-2">Shares</th>
            <th className="py-1 pr-2">Value</th>
            <th className="py-1 pr-2">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          {data.holdings.map((h) => {
            const holdingUp = h.gainDollar >= 0
            return (
              <tr
                key={h.id}
                onClick={() => setSelectedTicker(h.ticker)}
                className="border-b border-[var(--color-text)]/10 cursor-pointer hover:bg-[var(--color-text)]/10"
              >
                <td className="py-1 pr-2">{h.ticker}</td>
                <td className="py-1 pr-2">{h.shares}</td>
                <td className="py-1 pr-2">${h.currentValue.toFixed(2)}</td>
                <td className={`py-1 pr-2 ${holdingUp ? 'text-green-500' : 'text-red-500'}`}>
                  {holdingUp ? '+' : ''}${h.gainDollar.toFixed(2)} ({holdingUp ? '+' : ''}
                  {h.gainPct.toFixed(2)}%)
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {selectedTicker && <StockChart ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />}
    </section>
  )
}
