'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowIcon } from './icons'

type SeriesPoint = { time: number; portfolioReturnPct: number }

// Deliberately a hand-rolled polyline rather than Recharts: this is the landing
// page, and pulling the chart library in for a 90x28 decoration would cost far
// more than it's worth. Straight segments also match the main chart, which uses
// linear interpolation so it never draws a price that didn't happen.
function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const W = 90
  const H = 28

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W
      const y = H - ((v - min) / span) * H
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={up ? '#7bf1a8' : '#ffa2a2'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export default function PortfolioPreviewCard() {
  const [series, setSeries] = useState<SeriesPoint[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/paper-portfolio/performance?period=1M')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((d) => {
        if (!cancelled) setSeries(Array.isArray(d.series) ? d.series : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Most recent session's return. Chain-linked from the two cumulative figures
  // rather than subtracted, and never (endValue - startValue), because the
  // series already backs contributions out and those must stay out.
  const todayPct = (() => {
    if (!series || series.length < 2) return null
    const last = series[series.length - 1].portfolioReturnPct
    const prev = series[series.length - 2].portfolioReturnPct
    const base = 1 + prev / 100
    return base > 0 ? ((1 + last / 100) / base - 1) * 100 : null
  })()

  const up = (todayPct ?? 0) >= 0

  return (
    <Link
      href="/portfolio"
      className="group bg-[var(--color-card)] rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1.5rem)]
                 border border-transparent hover:border-[var(--color-text)]/15 transition-colors flex flex-col"
    >
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Portfolio</p>

      <div className="flex items-end justify-between gap-3 mb-2 min-h-[42px]">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Today</p>
          {todayPct === null ? (
            <span className={`text-2xl font-bold ${failed ? 'text-gray-600' : 'animate-pulse text-gray-700'}`}>
              {failed ? '—' : '···'}
            </span>
          ) : (
            <span className={`text-2xl font-bold tabular-nums ${up ? 'text-green-300' : 'text-red-300'}`}>
              {up ? '+' : ''}
              {todayPct.toFixed(2)}%
            </span>
          )}
        </div>
        {series && series.length > 1 && (
          <Sparkline values={series.map((p) => p.portfolioReturnPct)} up={up} />
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        A simulated portfolio tracked against the S&amp;P 500, with a thesis behind each position.
      </p>

      <span className="mt-auto inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400 group-hover:text-[var(--color-text)] transition-colors">
        View portfolio <ArrowIcon />
      </span>
    </Link>
  )
}
