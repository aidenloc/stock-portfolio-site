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
} from 'recharts'

const PERIODS = ['1D', '5D', '1M', '6M', 'YTD', '1Y'] as const
type Period = (typeof PERIODS)[number]
type Point = { time: number; price: number }

function formatLabel(timestamp: number, period: Period): string {
  const date = new Date(timestamp * 1000)
  if (period === '1D' || period === '5D') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function StockChart({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  const [period, setPeriod] = useState<Period>('1M')
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/history?ticker=${ticker}&period=${period}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load chart')
        setPoints([])
      } else {
        setPoints(data.points)
      }
    } catch {
      setError('Failed to load chart')
    } finally {
      setLoading(false)
    }
  }, [ticker, period])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const isUp = points.length > 1 && points[points.length - 1].price >= points[0].price

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="border border-[var(--color-text)]/20 rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1.5rem)] w-full max-w-2xl"
        style={{ backgroundColor: 'var(--color-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{ticker}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
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
        </div>

        <div className="h-72">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tickFormatter={(t) => formatLabel(t, period)} stroke="#888" minTickGap={40} />
                <YAxis domain={['auto', 'auto']} stroke="#888" width={60} />
                <Tooltip
                  labelFormatter={(t) => formatLabel(Number(t), period)}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #444' }}
                />
                <Line type="monotone" dataKey="price" stroke={isUp ? '#22c55e' : '#ef4444'} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}