'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CardCta } from './CardCta'

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
      className="group relative flex flex-col rounded-[var(--border-radius)] bg-[var(--color-card)]
                 p-[calc(var(--spacing-unit)*2.25rem)] border border-[var(--color-primary)]/15
                 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_32px_-16px_rgba(0,0,0,0.45)]
                 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30
                 hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_20px_40px_-16px_rgba(0,0,0,0.55)]"
    >
      <p className="text-xs uppercase tracking-widest text-[var(--color-text)]/45 mb-3">Portfolio</p>

      <div className="flex items-end justify-between gap-3 mb-2 min-h-[42px]">
        <div>
          <p className="text-xs text-[var(--color-text)]/45 mb-0.5">Today</p>
          {todayPct === null ? (
            <span className={`text-2xl font-bold ${failed ? 'text-[var(--color-text)]/35' : 'animate-pulse text-[var(--color-text)]/25'}`}>
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

      <p className="text-sm text-[var(--color-text)]/60 mb-4 leading-relaxed">
        A simulated portfolio tracked against the S&amp;P 500, with a thesis behind each position.
      </p>

      <CardCta label="View portfolio" />
    </Link>
  )
}
