'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Card from '../Card'
import YieldCurveChart from './YieldCurveChart'
import InflationFedFundsChart from './InflationFedFundsChart'
import SectorHeatmap, { type HeatmapRow } from './SectorHeatmap'
import {
  pivotMacroRows,
  pivotSectorRows,
  computeYoY,
  mergeSeriesByDate,
  computeTrailingReturns,
  rangeCutoff,
  decimate,
  buildTimeAxis,
  DATE_RANGE_OPTIONS,
  ALL_YAHOO_SYMBOLS,
  type DateRange,
  type MergedPoint,
} from '@/lib/macro'

type DashboardData = {
  macroSeries: { series_id: string; date: string; value: number }[]
  sectorPrices: { symbol: string; date: string; close: number }[]
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-text)]/10 rounded-[var(--border-radius)] ${className}`} />
}

function DashboardSkeleton() {
  return (
    <section className="mb-[calc(var(--spacing-unit)*3rem)] animate-pulse" aria-hidden="true">
      <p className="sr-only" role="status">
        Loading macro dashboard data
      </p>
      <SkeletonBlock className="h-3 w-32 mb-3" />
      <SkeletonBlock className="h-10 w-96 mb-8" />
      {[0, 1, 2].map((i) => (
        <Card key={i} className="mb-6">
          <SkeletonBlock className="h-6 w-56 mb-4" />
          <SkeletonBlock className="h-80 w-full" />
        </Card>
      ))}
    </section>
  )
}

function filterByRange(data: MergedPoint[], cutoff: number): MergedPoint[] {
  return data.filter((d) => d.time >= cutoff)
}

export default function MacroDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Defaults to the full cached history so both the 2008 and 2020 recession
  // bands are visible without an extra click.
  const [range, setRange] = useState<DateRange>('Max')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/macro/dashboard')
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'Failed to load dashboard data')
      } else {
        setData(d)
      }
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const macroBySeries = useMemo(() => pivotMacroRows(data?.macroSeries ?? []), [data])
  const sectorBySymbol = useMemo(() => pivotSectorRows(data?.sectorPrices ?? []), [data])

  // Merging (unioning dates across series and sorting) only depends on the
  // fetched data, not the selected range -- split out so clicking a range
  // button just filters+decimates an already-built array instead of
  // rebuilding it from scratch every time.
  const yieldCurveMerged = useMemo(() => mergeSeriesByDate(macroBySeries, ['DGS3MO', 'DGS2', 'DGS10']), [macroBySeries])
  const yieldCurveData = useMemo(
    () => decimate(filterByRange(yieldCurveMerged, rangeCutoff(range))),
    [yieldCurveMerged, range]
  )

  const inflationMerged = useMemo(() => {
    const cpiYoy = computeYoY(macroBySeries.CPIAUCSL ?? [])
    return mergeSeriesByDate({ CPI_YOY: cpiYoy, FEDFUNDS: macroBySeries.FEDFUNDS ?? [] }, ['CPI_YOY', 'FEDFUNDS'])
  }, [macroBySeries])
  const inflationData = useMemo(
    () => decimate(filterByRange(inflationMerged, rangeCutoff(range))),
    [inflationMerged, range]
  )

  // One domain and tick set spanning both charts, so the yield curve and the
  // inflation/policy-rate chart stack on a genuinely common time axis --
  // otherwise each picks its own ticks from its own first/last data point
  // (FEDFUNDS starts Jan 1, the DGS series Jan 3) and the two don't line up.
  const [domain, axis] = useMemo(() => {
    const times = [...yieldCurveData, ...inflationData].map((p) => p.time)
    if (times.length === 0) {
      const empty: [number, number] = [0, 0]
      return [empty, buildTimeAxis(0, 0)] as const
    }
    const bounds: [number, number] = [Math.min(...times), Math.max(...times)]
    return [bounds, buildTimeAxis(bounds[0], bounds[1])] as const
  }, [yieldCurveData, inflationData])

  // Trailing returns are always computed off the full cached history --
  // "1mo/3mo/6mo/YTD as of today" doesn't change with the line charts' range.
  const heatmapRows: HeatmapRow[] = useMemo(() => {
    return ALL_YAHOO_SYMBOLS.map((symbol): HeatmapRow | null => {
      const returns = computeTrailingReturns(sectorBySymbol[symbol] ?? [])
      return returns ? { symbol, returns } : null
    }).filter((r): r is HeatmapRow => r !== null)
  }, [sectorBySymbol])

  if (loading && !data) return <DashboardSkeleton />

  if (error) {
    return (
      <section className="mb-[calc(var(--spacing-unit)*3rem)]">
        <p className="text-sm text-red-400">{error}</p>
      </section>
    )
  }

  return (
    <section className="mb-[calc(var(--spacing-unit)*3rem)]">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text)]/45 mb-2">Macro & Markets</p>
      <h1 className="font-serif font-semibold tracking-tight text-4xl sm:text-5xl mb-4">Macro & Markets Dashboard</h1>
      <p className="text-sm text-[var(--color-text)]/60 max-w-2xl mb-6 leading-relaxed">
        Treasury yields, inflation versus the fed funds rate, and sector rotation across the market cycle — sourced
        from FRED and Yahoo Finance, refreshed daily.
      </p>

      <div
        className="inline-flex bg-[var(--color-bg)] rounded-full p-1 gap-1 mb-8"
        role="group"
        aria-label="Chart date range"
      >
        {DATE_RANGE_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
              range === r
                ? 'bg-[var(--color-primary)] text-[var(--color-bg)]'
                : 'text-[var(--color-text)]/60 hover:text-[var(--color-text)]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <Card className="mb-8">
        <h2 className="font-serif font-semibold text-xl mb-4">Treasury Yield Curve</h2>
        <YieldCurveChart data={yieldCurveData} domain={domain} axis={axis} />
      </Card>

      <Card className="mb-8">
        <h2 className="font-serif font-semibold text-xl mb-4">Inflation vs. Fed Funds Rate</h2>
        <InflationFedFundsChart data={inflationData} domain={domain} axis={axis} />
      </Card>

      <Card>
        <h2 className="font-serif font-semibold text-xl mb-4">Sector Rotation</h2>
        <SectorHeatmap rows={heatmapRows} />
      </Card>
    </section>
  )
}
