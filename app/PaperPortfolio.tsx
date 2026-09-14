'use client'

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useCallback,
  ViewTransition,
} from 'react'
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
  ReferenceDot,
  ReferenceLine,
} from 'recharts'
import StockChart from './StockChart'
import DailyBriefing from './DailyBriefing'
import EarningsCalendar from './EarningsCalendar'
import Card from './Card'

const PERIODS = ['1D', '1W', '1M', '6M', 'YTD', '1Y'] as const
type Period = (typeof PERIODS)[number]
const INTRADAY_PERIODS: Period[] = ['1D', '1W']

// Spoken forms, for button labels and the chart's text equivalent -- "1M" reads
// as "one em" to a screen reader.
const PERIOD_LABELS: Record<Period, string> = {
  '1D': 'past day',
  '1W': 'past week',
  '1M': 'past month',
  '6M': 'past six months',
  YTD: 'year to date',
  '1Y': 'past year',
}

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
  thesis: string | null
  currentPrice: number
  currentValue: number
  dayChangeDollar: number | null
  dayChangePct: number | null
  gainDollar: number
  gainPct: number
}

// One formatter for every currency figure on this page. Kept central because
// the headline once shipped as "$16,540.3" -- toLocaleString caps decimals with
// maximumFractionDigits but won't pad to two without the minimum as well.
const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const signedMoney = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`
const signedPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

type HoldingRow = Holding & { weightPct: number }
type SortKey = keyof Pick<
  HoldingRow,
  'ticker' | 'shares' | 'entryPrice' | 'currentPrice' | 'currentValue' | 'dayChangePct' | 'gainDollar' | 'weightPct'
>

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'ticker', label: 'Ticker', numeric: false },
  { key: 'shares', label: 'Shares', numeric: true },
  { key: 'entryPrice', label: 'Avg Cost', numeric: true },
  { key: 'currentPrice', label: 'Price', numeric: true },
  { key: 'currentValue', label: 'Market Value', numeric: true },
  { key: 'dayChangePct', label: 'Day', numeric: true },
  { key: 'gainDollar', label: 'Total Gain/Loss', numeric: true },
  { key: 'weightPct', label: 'Weight', numeric: true },
]

// Nulls (a holding whose prior close couldn't be resolved) always sort last, in
// both directions — flipping direction shouldn't drag empty cells to the top.
function sortRows(rows: HoldingRow[], key: SortKey, dir: 'asc' | 'desc'): HoldingRow[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av === null) return 1
    if (bv === null) return -1
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * factor
    return ((av as number) - (bv as number)) * factor
  })
}

type SeriesPoint = {
  time: number
  portfolioValue: number
  portfolioGainDollar: number
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

const dayKey = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString().slice(0, 10)

// Recharts types activeTooltipIndex as number | string | undefined depending on
// chart kind, so normalise it to a usable array index or null.
function activeIndexOf(state: { activeTooltipIndex?: unknown } | undefined): number | null {
  const raw = state?.activeTooltipIndex
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : null
}

type RangeStats = {
  lo: number
  hi: number
  startTime: number
  endTime: number
  gainDollar: number
  pct: number
  spyPct: number | null
}

// Change between two points of the series. Deliberately *not*
// (endValue - startValue): portfolioValue includes deposited capital, so a range
// spanning a newly opened position would count the cash that bought it as profit
// — the same flaw the time-weighted return fixes for the headline figure.
// portfolioGainDollar is already contribution-free, and the two cumulative TWR
// figures are chain-linked rather than subtracted.
function computeRangeStats(series: SeriesPoint[], start: number, end: number): RangeStats | null {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  if (lo === hi) return null

  const a = series[lo]
  const b = series[hi]
  if (!a || !b) return null

  const base = 1 + a.portfolioReturnPct / 100
  const pct = base > 0 ? ((1 + b.portfolioReturnPct / 100) / base - 1) * 100 : 0
  const spyPct = a.spyPrice && b.spyPrice ? (b.spyPrice / a.spyPrice - 1) * 100 : null

  return {
    lo,
    hi,
    startTime: a.time,
    endTime: b.time,
    gainDollar: b.portfolioGainDollar - a.portfolioGainDollar,
    pct,
    spyPct,
  }
}

type EntryMarker = { time: number; y: number; tickers: string[]; label: string; labelPosition: 'top' | 'bottom' }

// Markers for positions *opened* inside the visible window. The schema records a
// single entry_date/entry_price per holding and has no sell or add-to-position
// records, so these are honestly entries only -- not a full trade history.
// Entries before the window start simply don't appear.
function buildEntryMarkers(holdings: Holding[], series: SeriesPoint[]): EntryMarker[] {
  if (series.length === 0) return []
  const windowStart = dayKey(series[0].time)
  const byTime = new Map<number, EntryMarker>()

  for (const h of holdings) {
    if (h.entryDate < windowStart) continue
    const point = series.find((pt) => dayKey(pt.time) >= h.entryDate)
    if (!point) continue
    const existing = byTime.get(point.time)
    if (existing) {
      existing.tickers.push(h.ticker)
    } else {
      byTime.set(point.time, {
        time: point.time,
        y: point.portfolioReturnPct,
        tickers: [h.ticker],
        label: new Date(point.time * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        labelPosition: 'top',
      })
    }
  }

  const markers = Array.from(byTime.values()).sort((a, b) => a.time - b.time)

  // Two positions opened days apart collide at the top of the plot on a long
  // window (MTSI and WOLF are six days apart), so alternate the label side when
  // neighbours fall within 4% of the window's span.
  const span = series[series.length - 1].time - series[0].time
  const minGap = span * 0.04
  for (let i = 1; i < markers.length; i++) {
    if (markers[i].time - markers[i - 1].time < minGap) {
      markers[i].labelPosition = markers[i - 1].labelPosition === 'top' ? 'bottom' : 'top'
    }
  }
  return markers
}

function formatLabel(timestamp: number, period: Period): string {
  const date = new Date(timestamp * 1000)
  if (INTRADAY_PERIODS.includes(period)) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Brief count-up on the headline figure. Three things keep it from being a
// liability on the first number a reader looks at: it honours
// prefers-reduced-motion, it starts at the final value (not zero) when motion is
// reduced so there's no flash, and the h1 carries the true figure as an
// aria-label so assistive tech never announces the intermediate numbers.
// It only ever runs once -- totalValue is all-time, so switching periods must
// not re-trigger it.
const COUNT_UP_MS = 750

function CountUpMoney({ value }: { value: number }) {
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(() => (prefersReduced ? value : 0))
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current || prefersReduced) {
      setShown(value)
      return
    }
    hasAnimated.current = true

    const start = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / COUNT_UP_MS)
      setShown(value * (1 - Math.pow(1 - t, 3)))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setShown(value)
    })
    return () => cancelAnimationFrame(raf)
  }, [value, prefersReduced])

  return <>{money(shown)}</>
}

// Replaces Recharts' default tooltip. That one renders each series as one
// unwrappable line ("S&P 500 (SPY) : -1.39% ($761.78)"), which is wider than the
// plot on a phone; capping its wrapper width only made the text overflow the box
// instead. This lays the same numbers out in a column grid that is narrow by
// construction, so no width cap is needed.
type ChartTooltipPayload = { name?: string; value?: number; payload?: SeriesPoint }[] | undefined

function ChartTooltip({
  active,
  payload,
  label,
  period,
}: {
  active?: boolean
  payload?: ChartTooltipPayload
  label?: string | number
  period: Period
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  if (!point) return null

  const rows = payload
    .filter((p) => typeof p.value === 'number')
    .map((p) => {
      const isPortfolio = p.name === 'Portfolio'
      return {
        key: p.name ?? '',
        name: isPortfolio ? 'Portfolio' : 'S&P 500',
        pct: p.value as number,
        amount: isPortfolio ? point.portfolioValue : point.spyPrice,
      }
    })

  return (
    <div
      className="w-max bg-[var(--color-bg)]/95 backdrop-blur-sm border border-[var(--color-text)]/15
                 rounded-[var(--border-radius)] px-3 py-2 text-xs shadow-lg"
    >
      <p className="text-gray-400 mb-1.5">{formatLabel(Number(label), period)}</p>
      <div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-1 items-baseline">
        {rows.map((r) => (
          <Fragment key={r.key}>
            <span className="text-gray-400">{r.name}</span>
            <span className={`tabular-nums text-right ${r.pct >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {signedPct(r.pct)}
            </span>
            <span className="tabular-nums text-right text-gray-400">
              {typeof r.amount === 'number' ? money(r.amount) : ''}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-text)]/10 rounded-[var(--border-radius)] ${className}`} />
}

// Mirrors the real layout's shape so the page doesn't jump when data lands.
function PortfolioSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Loading portfolio data
      </p>
      <section className="mb-[calc(var(--spacing-unit)*3rem)] animate-pulse" aria-hidden="true">
        {/* Carries the morph target name too: the skeleton is what's on screen at
            the moment navigation commits, so if only the loaded state were named
            the pair wouldn't exist yet and no morph would form. */}
        <ViewTransition name="portfolio-hero" share="morph" default="none">
          <div className="mb-8">
            <div className="max-w-xl mb-5 space-y-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
            <SkeletonBlock className="h-3 w-28 mb-3" />
            <SkeletonBlock className="h-14 w-72 mb-3" />
            <SkeletonBlock className="h-4 w-56" />
          </div>
        </ViewTransition>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div>
            <Card className="mb-6">
              <SkeletonBlock className="h-8 w-72 mb-4" />
              <SkeletonBlock className="h-96 w-full" />
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              {[0, 1].map((i) => (
                <Card key={i}>
                  <SkeletonBlock className="h-3 w-44 mb-3" />
                  <SkeletonBlock className="h-7 w-full mb-3" />
                  <SkeletonBlock className="h-3 w-3/4" />
                </Card>
              ))}
            </div>
            <Card>
              <SkeletonBlock className="h-3 w-20 mb-4" />
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-4 w-28" />
                </div>
              ))}
            </Card>
          </div>
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <Card key={i}>
                <SkeletonBlock className="h-3 w-32 mb-4" />
                <SkeletonBlock className="h-4 w-full mb-2" />
                <SkeletonBlock className="h-4 w-5/6 mb-2" />
                <SkeletonBlock className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default function PaperPortfolio() {
  const [period, setPeriod] = useState<Period>('1M')
  const [data, setData] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBenchmark, setShowBenchmark] = useState(true)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('currentValue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function beginDrag(state: { activeTooltipIndex?: unknown } | undefined) {
    const i = activeIndexOf(state)
    if (i === null) return
    setIsDragging(true)
    setSelection({ start: i, end: i })
  }

  function extendDrag(state: { activeTooltipIndex?: unknown } | undefined) {
    if (!isDragging) return
    const i = activeIndexOf(state)
    if (i === null) return
    setSelection((prev) => (prev && prev.end !== i ? { ...prev, end: i } : prev))
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Names read best A-Z; money reads best largest-first.
      setSortDir(key === 'ticker' ? 'asc' : 'desc')
    }
  }

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // The drag ends wherever the pointer is released, which is often outside the
  // chart (or outside the window entirely) — listening on the chart alone would
  // leave it stuck in dragging state.
  useEffect(() => {
    if (!isDragging) return
    const endDrag = () => {
      setIsDragging(false)
      // A press with no drag is a click, which dismisses any pinned selection.
      setSelection((prev) => (prev && prev.start === prev.end ? null : prev))
    }
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchend', endDrag)
    window.addEventListener('touchcancel', endDrag)
    return () => {
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchend', endDrag)
      window.removeEventListener('touchcancel', endDrag)
    }
  }, [isDragging])

  const fetchPerformance = useCallback(async () => {
    setLoading(true)
    // Indices point into the previous period's series, so they're meaningless
    // once a different window loads.
    setSelection(null)
    setIsDragging(false)
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

  if (!data && loading) return <PortfolioSkeleton />
  if (!data || !data.holdings || data.holdings.length === 0) return null

  // A period switch refetches while the previous period's data is still on
  // screen. Dimming it beats swapping in a "Loading..." block, which collapsed
  // the chart's height and made the whole page jump on every period click.
  const refreshing = loading

  const periodReturnPct = data.series.length ? data.series[data.series.length - 1].portfolioReturnPct : 0
  // Not (endValue - startValue): that counts capital deposited mid-window as
  // profit, the same flaw the time-weighted return fixes on the API side.
  const periodDollarChange = data.series.length ? data.series[data.series.length - 1].portfolioGainDollar : 0
  const periodUp = periodDollarChange >= 0

  // Built from the unsorted API order on purpose: buildExposure assigns colors by
  // first-seen order, so feeding it the table's sorted copy would repaint the
  // allocation bar every time a column header is clicked.
  const exposureBySector = buildExposure(data.holdings, (h) => h.sector || 'Unknown')

  const rangeStats = selection ? computeRangeStats(data.series, selection.start, selection.end) : null
  const selectionAnchor = selection ? data.series[selection.start] : null

  const lastPoint = data.series.length ? data.series[data.series.length - 1] : null
  const benchmarkReturnPct = lastPoint ? lastPoint.spyReturnPct : null
  const entryMarkers = buildEntryMarkers(data.holdings, data.series)

  const rows: HoldingRow[] = data.holdings.map((h) => ({
    ...h,
    weightPct: data.totalValue > 0 ? (h.currentValue / data.totalValue) * 100 : 0,
  }))
  const sortedRows = sortRows(rows, sortKey, sortDir)

  return (
    <section className="mb-[calc(var(--spacing-unit)*3rem)]">
      {/* The home page's Portfolio card morphs into this block. */}
      <ViewTransition name="portfolio-hero" share="morph" default="none">
        <div className="mb-8">
          <p className="text-sm text-gray-400 max-w-xl mb-5">
            A simulated portfolio I manage to practice equity research and macro positioning — real trade
            decisions, tracked against the S&amp;P 500, with no real capital at risk.
          </p>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Paper Portfolio</p>
          <h1
            className="text-5xl sm:text-6xl font-bold tabular-nums leading-none mb-2"
            aria-label={money(data.totalValue)}
          >
            <CountUpMoney value={data.totalValue} />
          </h1>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${periodUp ? 'text-green-300' : 'text-red-300'}`}>
              {signedMoney(periodDollarChange)}
            </span>
            <GainBadge value={periodReturnPct} size="md">
              {signedPct(periodReturnPct)} · {period}
            </GainBadge>
          </div>
          <p className="text-xs text-gray-500">Tracked for performance only — not real money.</p>
        </div>
      </ViewTransition>

      {/* Everything below the hero arrives a beat later (see .rise in globals.css)
          so the morph stays the primary motion rather than competing with it. */}
      <ViewTransition enter="rise" default="none">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* min-w-0 is load-bearing: a grid item defaults to min-width:auto, so the
              1fr track couldn't shrink below the holdings table's 847px min-content
              and the whole page scrolled sideways between 1024px and ~1323px. With
              the track free to shrink, the table's own overflow-x-auto takes over. */}
          <div className="min-w-0">
          <Card className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Selected state was conveyed by colour alone; aria-pressed makes it
                  available to a screen reader too. */}
              <div className="inline-flex bg-[var(--color-bg)] rounded-full p-1 gap-1" role="group" aria-label="Chart time range">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    aria-pressed={period === p}
                    aria-label={`Show ${PERIOD_LABELS[p]}`}
                    className={`px-3 py-1 rounded-full text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                      period === p ? 'bg-[var(--color-primary)] text-white' : 'text-gray-400 hover:text-[var(--color-text)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowBenchmark((v) => !v)}
                aria-pressed={showBenchmark}
                aria-label="Overlay the S&P 500 benchmark"
                className={`ml-auto px-3 py-1 rounded-full text-sm border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                  showBenchmark ? 'border-[var(--color-text)]/40' : 'border-[var(--color-text)]/10 text-gray-400'
                }`}
              >
                S&amp;P 500
              </button>
            </div>

            {/* An SVG chart is opaque to a screen reader no matter how it's
                labelled, so the figure carries a text equivalent of the same
                numbers rather than just a role="img" name. */}
            <p className="sr-only">
              {`Line chart of portfolio return versus the S&P 500 over the ${PERIOD_LABELS[period]}. ` +
                `Portfolio ${signedPct(periodReturnPct)}` +
                (benchmarkReturnPct === null ? '.' : `, S&P 500 ${signedPct(benchmarkReturnPct)}.`) +
                (entryMarkers.length > 0
                  ? ` Positions opened during this window: ${entryMarkers.map((m) => `${m.tickers.join(' and ')} on ${m.label}`).join('; ')}.`
                  : '')}
            </p>
            <p className="sr-only" role="status">
              {rangeStats
                ? `Range selected, ${formatLabel(rangeStats.startTime, period)} to ${formatLabel(rangeStats.endTime, period)}: portfolio ${signedMoney(rangeStats.gainDollar)}, ${signedPct(rangeStats.pct)}` +
                  (rangeStats.spyPct === null ? '.' : `; S&P 500 ${signedPct(rangeStats.spyPct)}.`)
                : ''}
            </p>

            <div
              className={`relative h-96 select-none transition-opacity ${refreshing ? 'opacity-40' : 'opacity-100'}`}
              // pan-y keeps vertical page scrolling working on a phone while
              // letting a horizontal drag reach the chart instead of the browser.
              style={{ touchAction: 'pan-y' }}
              aria-busy={refreshing}
              role="img"
              aria-label={`Portfolio return ${signedPct(periodReturnPct)} over the ${PERIOD_LABELS[period]}. Click and drag across the chart to compare two dates.`}
            >
              {rangeStats && (
                // w-max sizes the box to its content, so a long figure widens the
                // box instead of spilling out of it; max-w still caps it against
                // the plot on a narrow screen. The values sit in a 3-column grid
                // rather than wrapping flex rows, which both guarantees they stay
                // inside and lines the two percentages up for comparison — the
                // whole point of the feature.
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 z-10 pointer-events-none
                             w-max max-w-[calc(100%-1rem)]
                             bg-[var(--color-bg)]/90 backdrop-blur-sm border border-[var(--color-text)]/15
                             rounded-[var(--border-radius)] px-3 py-2 text-xs shadow-lg"
                >
                  <p className="text-gray-400 mb-1.5">
                    {formatLabel(rangeStats.startTime, period)} – {formatLabel(rangeStats.endTime, period)}
                  </p>
                  <div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-1 items-baseline">
                    <span className="text-gray-400">Portfolio</span>
                    <span
                      className={`font-medium tabular-nums text-right ${
                        rangeStats.gainDollar >= 0 ? 'text-green-300' : 'text-red-300'
                      }`}
                    >
                      {signedMoney(rangeStats.gainDollar)}
                    </span>
                    <span
                      className={`tabular-nums text-right ${
                        rangeStats.pct >= 0 ? 'text-green-300' : 'text-red-300'
                      }`}
                    >
                      {signedPct(rangeStats.pct)}
                    </span>

                    {rangeStats.spyPct !== null && (
                      <>
                        <span className="text-gray-400">S&amp;P 500</span>
                        <span aria-hidden />
                        <span
                          className={`tabular-nums text-right ${
                            rangeStats.spyPct >= 0 ? 'text-green-300' : 'text-red-300'
                          }`}
                        >
                          {signedPct(rangeStats.spyPct)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {(
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.series}
                    style={{ cursor: 'crosshair' }}
                    onMouseDown={beginDrag}
                    onMouseMove={extendDrag}
                    onTouchStart={beginDrag}
                    onTouchMove={extendDrag}
                  >
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
                      content={({ active, payload, label }) => (
                        <ChartTooltip
                          active={active}
                          payload={payload as unknown as ChartTooltipPayload}
                          label={label}
                          period={period}
                        />
                      )}
                      // Kept mounted while dragging (Recharts derives activeTooltipIndex
                      // from the same machinery) but hidden, so the hover tooltip and the
                      // range label don't stack on top of each other.
                      wrapperStyle={isDragging ? { display: 'none' } : undefined}
                      allowEscapeViewBox={{ x: false, y: false }}
                    />
                    <Legend />
                    {/* type="linear", not "monotone": a monotone spline is a cubic
                        curve fitted through the closes, so between two points it
                        can bow above or below both of them and draw a price the
                        portfolio never traded at. Straight segments plot only
                        values that actually occurred, which is what Google
                        Finance and other real price charts do. */}
                    <Area
                      type="linear"
                      dataKey="portfolioReturnPct"
                      name="Portfolio"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#portfolioGlow)"
                      dot={false}
                    />
                    {showBenchmark && (
                      <Line
                        type="linear"
                        dataKey="spyReturnPct"
                        name="S&P 500 (SPY)"
                        stroke="#888"
                        dot={false}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Range selection. The anchor renders as soon as the pointer
                        goes down, before any drag distance, so the press has
                        immediate feedback. */}
                    {selectionAnchor && (
                      <ReferenceLine
                        x={selectionAnchor.time}
                        stroke="var(--color-text)"
                        strokeOpacity={0.45}
                        strokeDasharray="3 3"
                      />
                    )}
                    {selectionAnchor && (
                      <ReferenceDot
                        x={selectionAnchor.time}
                        y={selectionAnchor.portfolioReturnPct}
                        r={4}
                        fill="var(--color-text)"
                        stroke="var(--color-bg)"
                        strokeWidth={2}
                      />
                    )}
                    {rangeStats && (
                      <ReferenceLine
                        x={data.series[selection!.end].time}
                        stroke="var(--color-text)"
                        strokeOpacity={0.45}
                        strokeDasharray="3 3"
                      />
                    )}
                    {rangeStats && (
                      <ReferenceDot
                        x={data.series[selection!.end].time}
                        y={data.series[selection!.end].portfolioReturnPct}
                        r={4}
                        fill="var(--color-text)"
                        stroke="var(--color-bg)"
                        strokeWidth={2}
                      />
                    )}
                    {entryMarkers.map((m) => (
                      <ReferenceDot
                        key={m.time}
                        x={m.time}
                        y={m.y}
                        r={5}
                        fill="var(--color-primary)"
                        stroke="var(--color-bg)"
                        strokeWidth={2}
                        label={{
                          value: m.tickers.join(' / '),
                          position: m.labelPosition,
                          fill: '#9ca3af',
                          fontSize: 11,
                        }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            {entryMarkers.length > 0 && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-bg)]"
                />
                Position opened
              </p>
            )}
          </Card>

          {/* Per-holding exposure lived here too, but the holdings table's Weight
              column says the same thing in more detail, so the sector split is
              the only part that isn't duplicated. */}
          <Card className="mb-8">
            <ExposureBar title="Market exposure by sector" slices={exposureBySector} />
          </Card>

          <Card className="p-[calc(var(--spacing-unit)*0.5rem)] sm:p-[calc(var(--spacing-unit)*0.75rem)]">
            <p className="text-xs uppercase tracking-wide text-gray-500 px-4 pt-3 pb-2">Holdings</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <caption className="sr-only">
                  Paper portfolio holdings. Use the column headers to sort; select a row to open its price chart.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--color-text)]/10">
                    {COLUMNS.map((col) => {
                      const active = sortKey === col.key
                      return (
                        <th
                          key={col.key}
                          scope="col"
                          aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className={`px-3 py-2 font-normal whitespace-nowrap ${col.numeric ? 'text-right' : 'text-left'}`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            // gray-500 measured 4.19:1 against the card surface, under AA's 4.5
                            // for text this size; gray-400 measures 7.79:1.
                            className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide transition-colors ${
                              col.numeric ? 'flex-row-reverse' : ''
                            } ${active ? 'text-[var(--color-text)]' : 'text-gray-400 hover:text-[var(--color-text)]'}`}
                          >
                            {col.label}
                            <span aria-hidden className={active ? '' : 'opacity-0'}>
                              {sortDir === 'asc' ? '▲' : '▼'}
                            </span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((h) => {
                    const expanded = expandedIds.has(h.id)
                    return (
                      <Fragment key={h.id}>
                        <tr
                          onClick={() => setSelectedTicker(h.ticker)}
                          className="border-b border-[var(--color-text)]/5 cursor-pointer hover:bg-[var(--color-text)]/5 transition-colors"
                        >
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <span className="font-semibold">{h.ticker}</span>
                              {h.thesis && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpanded(h.id)
                                  }}
                                  aria-label={
                                    expanded
                                      ? `Hide investment thesis for ${h.ticker}`
                                      : `Show investment thesis for ${h.ticker}`
                                  }
                                  aria-expanded={expanded}
                                  className="text-gray-500 hover:text-[var(--color-text)] transition-colors p-1 rounded-full"
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                                  >
                                    <path d="m6 9 6 6 6-6" />
                                  </svg>
                                </button>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-400">
                            {h.shares.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-400">{money(h.entryPrice)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(h.currentPrice)}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium">{money(h.currentValue)}</td>
                          <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                            {h.dayChangePct === null ? (
                              <span className="text-gray-600">—</span>
                            ) : (
                              <span className={h.dayChangePct >= 0 ? 'text-green-300' : 'text-red-300'}>
                                {signedPct(h.dayChangePct)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <GainBadge value={h.gainDollar}>
                              {signedMoney(h.gainDollar)} ({signedPct(h.gainPct)})
                            </GainBadge>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-400">
                            {h.weightPct.toFixed(1)}%
                          </td>
                        </tr>
                        {expanded && h.thesis && (
                          <tr className="border-b border-[var(--color-text)]/5">
                            <td colSpan={COLUMNS.length} className="px-3 pb-3">
                              <p className="text-sm text-gray-400 italic max-w-2xl">{h.thesis}</p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <DailyBriefing />
            <EarningsCalendar />
          </div>
        </div>
      </ViewTransition>

      {selectedTicker && <StockChart ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />}
    </section>
  )
}
