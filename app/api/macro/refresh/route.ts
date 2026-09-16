import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fetchFredObservations } from '@/lib/fred'
import { fetchYahooChart } from '@/lib/macroYahoo'
import { FRED_SERIES_IDS, ALL_YAHOO_SYMBOLS } from '@/lib/macro'

// Long enough for the dashboard's 10Y/Max windows and for computing trailing
// returns (1mo/3mo/6mo/YTD) on day one; re-pulling the full range every run
// (rather than just "since last run") also self-heals any gaps.
const FRED_START = '2005-01-01'
const YAHOO_START = '2015-01-01'

async function refreshFredSeries(seriesId: string): Promise<void> {
  const observations = await fetchFredObservations(seriesId, FRED_START)
  const rows = observations
    .filter((o) => o.value !== '.')
    .map((o) => ({ series_id: seriesId, date: o.date, value: Number(o.value) }))

  if (rows.length === 0) return

  const { error } = await supabaseAdmin.from('macro_series').upsert(rows, { onConflict: 'series_id,date' })
  if (error) throw new Error(error.message)
}

async function refreshYahooSymbol(symbol: string): Promise<void> {
  const quotes = await fetchYahooChart(symbol, YAHOO_START)
  const rows = quotes
    .filter((q) => q.close !== null)
    .map((q) => ({
      symbol,
      date: q.date.toISOString().slice(0, 10),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    }))

  if (rows.length === 0) return

  const { error } = await supabaseAdmin.from('sector_prices').upsert(rows, { onConflict: 'symbol,date' })
  if (error) throw new Error(error.message)
}

// Triggered once a day by Vercel Cron (see vercel.json). Requires the same
// CRON_SECRET bearer token as app/api/cron/daily-briefing so it can't be hit
// publicly.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const failures: string[] = []

  const fredResults = await Promise.allSettled(FRED_SERIES_IDS.map((id) => refreshFredSeries(id)))
  fredResults.forEach((r, i) => {
    if (r.status === 'rejected') failures.push(`FRED ${FRED_SERIES_IDS[i]}: ${r.reason}`)
  })

  const yahooResults = await Promise.allSettled(ALL_YAHOO_SYMBOLS.map((s) => refreshYahooSymbol(s)))
  yahooResults.forEach((r, i) => {
    if (r.status === 'rejected') failures.push(`Yahoo ${ALL_YAHOO_SYMBOLS[i]}: ${r.reason}`)
  })

  return NextResponse.json({
    success: failures.length === 0,
    seriesRefreshed: FRED_SERIES_IDS.length - fredResults.filter((r) => r.status === 'rejected').length,
    symbolsRefreshed: ALL_YAHOO_SYMBOLS.length - yahooResults.filter((r) => r.status === 'rejected').length,
    failures,
  })
}
