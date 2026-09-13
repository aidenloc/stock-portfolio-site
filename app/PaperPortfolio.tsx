'use client'

import { useEffect, useState } from 'react'
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
  date: string
  portfolioValue: number
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function PaperPortfolio() {
  const [data, setData] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/paper-portfolio/performance')
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!data || !data.holdings || data.holdings.length === 0) return null

  const isUp = data.totalReturnPct >= 0

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
          {data.totalReturnPct.toFixed(2)}% all-time
        </span>
      </div>

      <div className="h-72 mb-6 border border-[var(--color-text)]/20 rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888" minTickGap={40} />
            <YAxis domain={['auto', 'auto']} stroke="#888" width={60} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip
              labelFormatter={(d) => formatDate(String(d))}
              formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, name]}
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
            <Line
              type="monotone"
              dataKey="spyReturnPct"
              name="S&P 500 (SPY)"
              stroke="#888"
              dot={false}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ResponsiveContainer>
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
