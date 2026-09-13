import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { fetchYahooHistory, periodSince, dateKey, type HistoryPoint } from '@/lib/yahooHistory'

const BENCHMARK_TICKER = 'SPY'

type Holding = {
  id: number
  ticker: string
  shares: number
  entry_price: number
  entry_date: string
}

// Forward-fills: returns the most recent known price at or before `key`.
function priceAt(series: Map<string, number>, sortedKeys: string[], key: string): number | undefined {
  let result: number | undefined
  for (const k of sortedKeys) {
    if (k > key) break
    if (series.has(k)) result = series.get(k)
  }
  return result
}

export async function GET() {
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

  const earliestEntryDate = holdings.reduce((min, h) => (h.entry_date < min ? h.entry_date : min), holdings[0].entry_date)
  const period = periodSince(new Date(earliestEntryDate))
  const uniqueTickers = Array.from(new Set([...holdings.map((h) => h.ticker), BENCHMARK_TICKER]))

  const results = await Promise.allSettled(
    uniqueTickers.map(async (ticker) => [ticker, await fetchYahooHistory(ticker, period)] as [string, HistoryPoint[]])
  )

  const priceSeries = new Map<string, Map<string, number>>()
  const sortedKeysByTicker = new Map<string, string[]>()

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const [ticker, points] = result.value
    const series = new Map<string, number>()
    for (const p of points) series.set(dateKey(p.time), p.price)
    priceSeries.set(ticker, series)
    sortedKeysByTicker.set(ticker, Array.from(series.keys()).sort())
  }

  const spySeries = priceSeries.get(BENCHMARK_TICKER)
  const spyKeys = sortedKeysByTicker.get(BENCHMARK_TICKER) ?? []

  const allDateKeys = Array.from(
    new Set(Array.from(priceSeries.values()).flatMap((s) => Array.from(s.keys())))
  )
    .filter((k) => k >= earliestEntryDate)
    .sort()

  const spyBaseline = spySeries && spyKeys.length ? priceAt(spySeries, spyKeys, allDateKeys[0]) : undefined

  const series = allDateKeys.map((date) => {
    let value = 0
    let cost = 0
    for (const h of holdings as Holding[]) {
      if (h.entry_date > date) continue
      const tSeries = priceSeries.get(h.ticker)
      const tKeys = sortedKeysByTicker.get(h.ticker)
      const price = tSeries && tKeys ? priceAt(tSeries, tKeys, date) ?? h.entry_price : h.entry_price
      value += h.shares * price
      cost += h.shares * h.entry_price
    }

    const spyPrice = spySeries && spyKeys.length ? priceAt(spySeries, spyKeys, date) : undefined
    const spyReturnPct = spyPrice && spyBaseline ? (spyPrice / spyBaseline - 1) * 100 : null

    return {
      date,
      portfolioValue: value,
      portfolioReturnPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      spyReturnPct,
    }
  })

  const holdingsBreakdown = (holdings as Holding[]).map((h) => {
    const tSeries = priceSeries.get(h.ticker)
    const tKeys = sortedKeysByTicker.get(h.ticker)
    const lastKey = tKeys && tKeys.length ? tKeys[tKeys.length - 1] : undefined
    const currentPrice = tSeries && lastKey ? tSeries.get(lastKey) ?? h.entry_price : h.entry_price
    const currentValue = h.shares * currentPrice
    const costBasis = h.shares * h.entry_price
    return {
      id: h.id,
      ticker: h.ticker,
      shares: h.shares,
      entryPrice: h.entry_price,
      entryDate: h.entry_date,
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
