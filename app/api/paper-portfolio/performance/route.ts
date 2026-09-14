import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fetchYahooHistory, dateKey, type HistoryPoint, type Period as YahooPeriod } from '@/lib/yahooHistory'
import { fetchSector } from '@/lib/sector'

const BENCHMARK_TICKER = 'SPY'

// UI period label -> Yahoo range bucket. "1W" maps to Yahoo's 5-trading-day
// bucket since Yahoo has no native 1-calendar-week range.
const PERIOD_MAP: Record<string, YahooPeriod> = {
  '1D': '1D',
  '1W': '5D',
  '1M': '1M',
  '6M': '6M',
  YTD: 'YTD',
  '1Y': '1Y',
}

type Holding = {
  id: number
  ticker: string
  shares: number
  entry_price: number
  entry_date: string
  sector: string | null
  thesis: string | null
}

// Forward-fills: latest known price at or before `targetTime`. `points` must be sorted ascending by time.
function priceAtOrBefore(points: HistoryPoint[], targetTime: number): number | undefined {
  let result: number | undefined
  for (const p of points) {
    if (p.time > targetTime) break
    result = p.price
  }
  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const periodParam = searchParams.get('period') || '1M'
  const yahooPeriod = PERIOD_MAP[periodParam]

  if (!yahooPeriod) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const { data: holdings, error } = await supabase
    .from('paper_portfolio')
    .select('*')
    .order('entry_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!holdings || holdings.length === 0) {
    return NextResponse.json({ holdings: [], series: [], totalValue: 0, totalCost: 0, totalReturnPct: 0 })
  }

  const typedHoldings = holdings as Holding[]

  // One-time backfill for rows added before sector tracking existed (or where
  // the Finnhub lookup failed at add-time) — persisted so this only runs once
  // per ticker, not on every page load.
  const missingSectorTickers = Array.from(new Set(typedHoldings.filter((h) => !h.sector).map((h) => h.ticker)))
  if (missingSectorTickers.length > 0) {
    const sectorEntries = await Promise.all(
      missingSectorTickers.map(async (ticker) => [ticker, await fetchSector(ticker)] as const)
    )
    const sectorByTicker = new Map(sectorEntries)

    const updateResults = await Promise.all(
      typedHoldings
        .filter((h) => !h.sector && sectorByTicker.get(h.ticker))
        .map((h) => supabaseAdmin.from('paper_portfolio').update({ sector: sectorByTicker.get(h.ticker) }).eq('id', h.id))
    )
    for (const result of updateResults) {
      // Don't let a persistence failure pass silently — if this keeps failing
      // (e.g. the sector column migration was never actually run), every
      // request will re-fetch from Finnhub instead of caching, defeating the
      // point of this backfill.
      if (result.error) console.error('Failed to persist sector backfill:', result.error.message)
    }

    for (const h of typedHoldings) {
      if (!h.sector) h.sector = sectorByTicker.get(h.ticker) ?? null
    }
  }

  const uniqueTickers = Array.from(new Set([...typedHoldings.map((h) => h.ticker), BENCHMARK_TICKER]))

  const results = await Promise.allSettled(
    uniqueTickers.map(async (ticker) => [ticker, await fetchYahooHistory(ticker, yahooPeriod)] as [string, HistoryPoint[]])
  )

  const pointsByTicker = new Map<string, HistoryPoint[]>()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const [ticker, points] = result.value
    pointsByTicker.set(ticker, [...points].sort((a, b) => a.time - b.time))
  }

  const spyPoints = pointsByTicker.get(BENCHMARK_TICKER)

  // SPY trades every session, so its own timestamps make the fullest backbone for the window.
  const axisTimes = spyPoints?.map((p) => p.time) ?? []

  const rawSeries = axisTimes.map((t) => {
    let value = 0
    for (const h of typedHoldings) {
      if (h.entry_date > dateKey(t)) continue
      const points = pointsByTicker.get(h.ticker)
      const price = (points ? priceAtOrBefore(points, t) : undefined) ?? h.entry_price
      value += h.shares * price
    }
    const spyPrice = spyPoints ? priceAtOrBefore(spyPoints, t) : undefined
    return { time: t, value, spyPrice }
  })

  // Trim leading points where nothing was held yet, then rebase returns to 0% at
  // the window's first point (so each period button shows performance *during
  // that window*, not the since-inception curve zoomed in).
  const firstActiveIndex = rawSeries.findIndex((pt) => pt.value > 0)
  const activeSeries = firstActiveIndex === -1 ? [] : rawSeries.slice(firstActiveIndex)
  const baseValue = activeSeries[0]?.value
  const baseSpy = activeSeries[0]?.spyPrice

  const series = activeSeries.map((pt) => ({
    time: pt.time,
    portfolioValue: pt.value,
    spyPrice: pt.spyPrice ?? null,
    portfolioReturnPct: baseValue ? ((pt.value - baseValue) / baseValue) * 100 : 0,
    spyReturnPct: baseSpy && pt.spyPrice ? ((pt.spyPrice - baseSpy) / baseSpy) * 100 : null,
  }))

  const holdingsBreakdown = typedHoldings.map((h) => {
    const points = pointsByTicker.get(h.ticker)
    const currentPrice = points && points.length ? points[points.length - 1].price : h.entry_price
    const currentValue = h.shares * currentPrice
    const costBasis = h.shares * h.entry_price
    return {
      id: h.id,
      ticker: h.ticker,
      shares: h.shares,
      entryPrice: h.entry_price,
      entryDate: h.entry_date,
      sector: h.sector,
      thesis: h.thesis,
      currentPrice,
      currentValue,
      gainDollar: currentValue - costBasis,
      gainPct: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
    }
  })

  const totalValue = holdingsBreakdown.reduce((sum, h) => sum + h.currentValue, 0)
  const totalCost = holdingsBreakdown.reduce((sum, h) => sum + h.shares * h.entryPrice, 0)

  return NextResponse.json({
    holdings: holdingsBreakdown,
    series,
    totalValue,
    totalCost,
    totalReturnPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
  })
}
