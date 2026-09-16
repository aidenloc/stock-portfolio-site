// Shared constants and pure data-shaping helpers for the macro dashboard.
// Used server-side by the refresh/dashboard API routes and client-side by
// the dashboard components -- no fetch calls or secrets live here.

export const FRED_SERIES_IDS = ['GDPC1', 'CPIAUCSL', 'UNRATE', 'FEDFUNDS', 'DGS10', 'DGS2', 'DGS3MO'] as const
export type FredSeriesId = (typeof FRED_SERIES_IDS)[number]

export const SECTOR_SYMBOLS = ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC'] as const
export const OTHER_ASSET_SYMBOLS = ['TLT', 'GLD', 'USO', 'UUP'] as const
export const ALL_YAHOO_SYMBOLS = [...SECTOR_SYMBOLS, ...OTHER_ASSET_SYMBOLS]
export type YahooSymbol = (typeof ALL_YAHOO_SYMBOLS)[number]

export const ASSET_LABELS: Record<string, string> = {
  XLK: 'Technology',
  XLF: 'Financials',
  XLE: 'Energy',
  XLV: 'Health Care',
  XLY: 'Consumer Disc.',
  XLP: 'Consumer Staples',
  XLI: 'Industrials',
  XLB: 'Materials',
  XLRE: 'Real Estate',
  XLU: 'Utilities',
  XLC: 'Communication',
  TLT: 'Bonds (TLT)',
  GLD: 'Gold (GLD)',
  USO: 'Oil (USO)',
  UUP: 'Dollar (UUP)',
}

export type AssetClass = 'Sector' | 'Bond' | 'Commodity' | 'Currency'

export const ASSET_CLASS: Record<string, AssetClass> = {
  TLT: 'Bond',
  GLD: 'Commodity',
  USO: 'Commodity',
  UUP: 'Currency',
}
for (const s of SECTOR_SYMBOLS) ASSET_CLASS[s] = 'Sector'

export const ASSET_CLASS_FILTERS = ['All', 'Sector', 'Bond', 'Commodity', 'Currency'] as const
export type AssetClassFilter = (typeof ASSET_CLASS_FILTERS)[number]

// Fixed hue order, assigned by series identity (never cycled/re-sorted) --
// the same validated dark-surface palette PaperPortfolio.tsx uses for its
// own categorical series.
export const SERIES_COLORS = {
  DGS3MO: '#3987e5',
  DGS2: '#d95926',
  DGS10: '#199e70',
  CPI_YOY: '#d95926',
  FEDFUNDS: '#3987e5',
} as const

// NBER-dated US recessions. Hardcoded rather than fetched (the page never
// calls FRED directly -- see app/api/macro/refresh) and short enough that a
// live USREC series would be overkill for shading a handful of bands.
export const RECESSIONS: { start: string; end: string }[] = [
  { start: '1980-01-01', end: '1980-07-31' },
  { start: '1981-07-01', end: '1982-11-30' },
  { start: '1990-07-01', end: '1991-03-31' },
  { start: '2001-03-01', end: '2001-11-30' },
  { start: '2007-12-01', end: '2009-06-30' },
  { start: '2020-02-01', end: '2020-04-30' },
]

// Recessions overlapping [minTime, maxTime], as epoch-second bounds clamped
// to the visible window -- so a ReferenceArea never tries to draw past the
// chart's own data range.
export function recessionsInRange(minTime: number, maxTime: number): { start: number; end: number }[] {
  return RECESSIONS.map((r) => ({ start: toEpochSeconds(r.start), end: toEpochSeconds(r.end) }))
    .filter((r) => r.end >= minTime && r.start <= maxTime)
    .map((r) => ({ start: Math.max(r.start, minTime), end: Math.min(r.end, maxTime) }))
}

export type SeriesPoint = { date: string; value: number }

// Unix seconds at UTC midnight -- matches the epoch-seconds convention
// StockChart/PaperPortfolio already use for chart x-axes, so ReferenceArea/
// ReferenceLine bands line up on a continuous numeric scale instead of a
// categorical one.
export function toEpochSeconds(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000)
}

export function pivotBy<T extends { date: string; value: number }>(
  rows: (T & { key: string })[]
): Record<string, SeriesPoint[]> {
  const map: Record<string, SeriesPoint[]> = {}
  for (const row of rows) {
    if (!map[row.key]) map[row.key] = []
    map[row.key].push({ date: row.date, value: row.value })
  }
  for (const key in map) map[key].sort((a, b) => a.date.localeCompare(b.date))
  return map
}

export function pivotMacroRows(rows: { series_id: string; date: string; value: number }[]): Record<string, SeriesPoint[]> {
  return pivotBy(rows.map((r) => ({ key: r.series_id, date: r.date, value: r.value })))
}

export function pivotSectorRows(rows: { symbol: string; date: string; close: number }[]): Record<string, SeriesPoint[]> {
  return pivotBy(rows.map((r) => ({ key: r.symbol, date: r.date, value: r.close })))
}

// Year-over-year % change for a monthly series (e.g. CPI), keyed off the
// calendar month rather than a fixed day offset since FRED's monthly release
// date isn't always the same day of month.
export function computeYoY(series: SeriesPoint[]): SeriesPoint[] {
  const byMonth = new Map<string, number>()
  for (const p of series) byMonth.set(p.date.slice(0, 7), p.value)

  const out: SeriesPoint[] = []
  for (const p of series) {
    const d = new Date(`${p.date}T00:00:00Z`)
    d.setUTCFullYear(d.getUTCFullYear() - 1)
    const priorKey = d.toISOString().slice(0, 7)
    const prior = byMonth.get(priorKey)
    if (prior !== undefined && prior !== 0) {
      out.push({ date: p.date, value: (p.value / prior - 1) * 100 })
    }
  }
  return out
}

export type MergedPoint = { time: number } & Record<string, number | null>

// Unions every date across the given series keys and aligns them into one
// row per date (missing values become null, which Recharts renders as a gap
// rather than interpolating across it).
export function mergeSeriesByDate(seriesMap: Record<string, SeriesPoint[]>, keys: string[]): MergedPoint[] {
  const dateSet = new Set<string>()
  for (const k of keys) for (const p of seriesMap[k] ?? []) dateSet.add(p.date)
  const dates = Array.from(dateSet).sort()

  const lookups = keys.map((k) => new Map((seriesMap[k] ?? []).map((p) => [p.date, p.value])))

  return dates.map((date) => {
    const row = { time: toEpochSeconds(date) } as MergedPoint
    keys.forEach((k, i) => {
      row[k] = lookups[i].get(date) ?? null
    })
    return row
  })
}

// Latest point at or before targetDate. `series` must be sorted ascending by date.
function valueOnOrBefore(series: SeriesPoint[], targetDate: string): SeriesPoint | undefined {
  let result: SeriesPoint | undefined
  for (const p of series) {
    if (p.date > targetDate) break
    result = p
  }
  return result
}

function subtractMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - months)
  return d.toISOString().slice(0, 10)
}

export const TRAILING_PERIODS = [
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: 'ytd', label: 'YTD' },
] as const
export type TrailingPeriodKey = (typeof TRAILING_PERIODS)[number]['key']

export type TrailingReturns = Record<TrailingPeriodKey, number | null>

// Trailing % returns for one symbol's close-price series, for each of the
// four heatmap columns -- null when there isn't enough history yet (e.g. a
// symbol like XLC that IPO'd more recently than the lookback window).
export function computeTrailingReturns(series: SeriesPoint[]): TrailingReturns | null {
  if (series.length === 0) return null
  const latest = series[series.length - 1]
  const asOf = latest.date

  const yearStart = `${asOf.slice(0, 4)}-01-01`

  const bases: Record<TrailingPeriodKey, string> = {
    '1mo': subtractMonths(asOf, 1),
    '3mo': subtractMonths(asOf, 3),
    '6mo': subtractMonths(asOf, 6),
    ytd: yearStart,
  }

  const result = {} as TrailingReturns
  for (const key of Object.keys(bases) as TrailingPeriodKey[]) {
    const base = valueOnOrBefore(series, bases[key])
    result[key] = base && base.value !== 0 ? (latest.value / base.value - 1) * 100 : null
  }
  return result
}

export const DATE_RANGE_OPTIONS = ['1Y', '5Y', '10Y', 'Max'] as const
export type DateRange = (typeof DATE_RANGE_OPTIONS)[number]

// Cutoff (unix seconds) for filtering an already-loaded series to the
// selected range -- filtering in memory rather than refetching, since the
// dashboard loads its full cached history once.
export function rangeCutoff(range: DateRange): number {
  if (range === 'Max') return 0
  const years = range === '1Y' ? 1 : range === '5Y' ? 5 : 10
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - years)
  return Math.floor(d.getTime() / 1000)
}

// Every timestamp on these charts is UTC midnight (see toEpochSeconds), so
// every formatter must read it back in UTC too. Formatting in local time
// shifted every label a day earlier west of Greenwich -- enough to push
// Jan 1 back into the previous year and visibly desync two stacked charts.
export function formatFullDate(timeSec: number): string {
  return new Date(timeSec * 1000).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatMonthYear(timeSec: number): string {
  const d = new Date(timeSec * 1000)
  const month = d.toLocaleDateString([], { month: 'short', timeZone: 'UTC' })
  // "Jan '05" rather than "Jan 05", which reads as a day of the month.
  return `${month} '${d.toLocaleDateString([], { year: '2-digit', timeZone: 'UTC' })}`
}

function formatYear(timeSec: number): string {
  return new Date(timeSec * 1000).toLocaleDateString([], { year: 'numeric', timeZone: 'UTC' })
}

export type TimeAxis = { ticks: number[]; formatTick: (timeSec: number) => string }

const TICK_MONTH_STEPS = [1, 2, 3, 6, 12, 24, 36, 60, 120]
const TARGET_TICKS = 6

// Ticks on clean month/year boundaries, shared by both time-series charts so
// their x-axes line up exactly instead of each picking its own from a
// slightly different data domain. Year-scale steps get year-only labels.
export function buildTimeAxis(minTime: number, maxTime: number): TimeAxis {
  if (!(maxTime > minTime)) return { ticks: [], formatTick: formatMonthYear }

  const months = (maxTime - minTime) / (30.44 * 86400)
  const step = TICK_MONTH_STEPS.find((s) => months / s <= TARGET_TICKS) ?? TICK_MONTH_STEPS[TICK_MONTH_STEPS.length - 1]

  const first = new Date(minTime * 1000)
  const cursor = new Date(
    Date.UTC(first.getUTCFullYear(), step >= 12 ? 0 : first.getUTCMonth(), 1)
  )

  const ticks: number[] = []
  while (Math.floor(cursor.getTime() / 1000) <= maxTime) {
    const t = Math.floor(cursor.getTime() / 1000)
    if (t >= minTime) ticks.push(t)
    cursor.setUTCMonth(cursor.getUTCMonth() + step)
  }

  return { ticks, formatTick: step >= 12 ? formatYear : formatMonthYear }
}

const MAX_CHART_POINTS = 800

// Recharts draws one SVG point per array element; a decade of daily Treasury
// yields is 5,000+ points, far more than the ~700px a card is actually wide
// on screen, and was the main source of lag on "Max". Stride-sampling is
// fine here (unlike a price chart, these are already-smooth macro series
// with no intraday noise to preserve) -- the last point is always kept so
// the chart's right edge still matches "today."
export function decimate<T>(points: T[], maxPoints: number = MAX_CHART_POINTS): T[] {
  if (points.length <= maxPoints) return points
  const stride = Math.ceil(points.length / maxPoints)
  const out: T[] = []
  for (let i = 0; i < points.length; i += stride) out.push(points[i])
  const last = points[points.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}
