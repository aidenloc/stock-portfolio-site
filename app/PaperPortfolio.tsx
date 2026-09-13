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

const PERIODS = ['1D', '1W', '1M', '6M', 'YTD', '1Y'] as const
type Period = (typeof PERIODS)[number]
const INTRADAY_PERIODS: Period[] = ['1D', '1W']

type Holding = {
  id: number
  ticker: string
  shares: number
  entryPrice: number
  entryDate: string
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
              <tr key={h.id} className="border-b border-[var(--color-text)]/10">
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
    </section>
  )
}
