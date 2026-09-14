import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fetchYahooHistory, dateKey, type HistoryPoint, type Period as YahooPeriod } from '@/lib/yahooHistory'
import { fetchSector } from '@/lib/sector'

const BENCHMARK_TICKER = 'SPY'

// UI periods that Yahoo serves at an intraday interval (5m/15m) rather than daily.
const INTRADAY_PERIODS = ['1D', '1W']

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

// Previous trading day's close. Deliberately keyed off the last two *dates*
// rather than the last two points: the 1D/1W ranges come back at 5m/15m
// intervals, so "the second-to-last point" there would be a five-minute-old
// price, not yesterday's close. `points` must be sorted ascending by time.
function previousDailyClose(points: HistoryPoint[]): number | undefined {
  const lastCloseByDate = new Map<string, number>()
  for (const p of points) lastCloseByDate.set(dateKey(p.time), p.price)
  const dates = Array.from(lastCloseByDate.keys()).sort()
  if (dates.length < 2) return undefined
  return lastCloseByDate.get(dates[dates.length - 2])
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

  // Day change belongs to the holding, not to the selected chart window, so it
  // must read the same on every period button. The 1D/1W ranges come back at
  // 5m/15m intervals, where the prior date's last bar is a few minutes shy of
  // the official close (worth ~0.05-0.25pp of drift against the other periods),
  // and 1D spans a single date with no prior close in it at all. Both therefore
  // take their baseline from one compact daily range instead.
  let dayChangePoints = pointsByTicker
  if (INTRADAY_PERIODS.includes(periodParam)) {
    const dailyTickers = Array.from(new Set(typedHoldings.map((h) => h.ticker)))
    const dailyResults = await Promise.allSettled(
      dailyTickers.map(async (ticker) => [ticker, await fetchYahooHistory(ticker, '1M')] as [string, HistoryPoint[]])
    )
    dayChangePoints = new Map<string, HistoryPoint[]>()
    for (const result of dailyResults) {
      if (result.status !== 'fulfilled') continue
      const [ticker, points] = result.value
      dayChangePoints.set(ticker, [...points].sort((a, b) => a.time - b.time))
    }
  }

  const spyPoints = pointsByTicker.get(BENCHMARK_TICKER)

  // SPY trades every session, so its own timestamps make the fullest backbone for the window.
  const axisTimes = spyPoints?.map((p) => p.time) ?? []

  const rawSeries = axisTimes.map((t, i) => {
    const dateNow = dateKey(t)
    const datePrev = i > 0 ? dateKey(axisTimes[i - 1]) : null
    let value = 0
    let contribution = 0
    for (const h of typedHoldings) {
      if (h.entry_date > dateNow) continue
      const points = pointsByTicker.get(h.ticker)
      const price = (points ? priceAtOrBefore(points, t) : undefined) ?? h.entry_price
      value += h.shares * price
      // Opened since the previous axis point, so the cash that bought it lands in
      // `value` for the first time here. That is deposited capital, not a gain.
      if (datePrev !== null && h.entry_date > datePrev) {
        contribution += h.shares * h.entry_price
      }
    }
    const spyPrice = spyPoints ? priceAtOrBefore(spyPoints, t) : undefined
    return { time: t, value, contribution, spyPrice }
  })

  // Trim leading points where nothing was held yet, then anchor at 0% on the
  // window's first point, so each period button shows performance *during that
  // window* rather than the since-inception curve zoomed in.
  const firstActiveIndex = rawSeries.findIndex((pt) => pt.value > 0)
  const activeSeries = firstActiveIndex === -1 ? [] : rawSeries.slice(firstActiveIndex)
  const baseSpy = activeSeries[0]?.spyPrice

  // Time-weighted return. The naive (value - startValue) / startValue counts
  // every position opened mid-window as profit: on a 1Y window this portfolio
  // started at $975 (VOR only) and ended at $16.5k, reading as +1,596% when the
  // real return on cost was +46%. Each step therefore backs out that step's
  // contribution before measuring growth, and the steps are chain-linked --
  // the same method a fund fact sheet uses, and the only way this line is
  // honestly comparable to the SPY line drawn beside it.
  let growth = 1
  let gainDollar = 0

  const series = activeSeries.map((pt, i) => {
    if (i > 0) {
      const prev = activeSeries[i - 1]
      if (prev.value > 0) {
        const stepGain = pt.value - pt.contribution - prev.value
        growth *= 1 + stepGain / prev.value
        gainDollar += stepGain
      }
    }
    return {
      time: pt.time,
      portfolioValue: pt.value,
      portfolioGainDollar: gainDollar,
      spyPrice: pt.spyPrice ?? null,
      portfolioReturnPct: (growth - 1) * 100,
      spyReturnPct: baseSpy && pt.spyPrice ? ((pt.spyPrice - baseSpy) / baseSpy) * 100 : null,
    }
  })

  const holdingsBreakdown = typedHoldings.map((h) => {
    const points = pointsByTicker.get(h.ticker)
    const currentPrice = points && points.length ? points[points.length - 1].price : h.entry_price
    const currentValue = h.shares * currentPrice
    const costBasis = h.shares * h.entry_price

    // Measured against the same currentPrice shown in the table, so the day
    // change always reconciles with the price column instead of being derived
    // from a separate "latest" that could be a few minutes out of step.
    const prevClose = previousDailyClose(dayChangePoints.get(h.ticker) ?? [])
    const dayChangeDollar = prevClose ? (currentPrice - prevClose) * h.shares : null
    const dayChangePct = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : null

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
      dayChangeDollar,
      dayChangePct,
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
