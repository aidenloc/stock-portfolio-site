import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { fetchAllRows } from '@/lib/supabasePage'
import { FRED_SERIES_IDS, ALL_YAHOO_SYMBOLS } from '@/lib/macro'

type MacroRow = { series_id: string; date: string; value: number }
type SectorRow = { symbol: string; date: string; close: number }

// The underlying tables only change once a day (the refresh cron), so it's
// safe to let Next cache this route's response instead of re-paginating
// ~60k rows out of Supabase on every single page load.
export const revalidate = 3600

export async function GET() {
  const [macroResult, sectorResult] = await Promise.all([
    fetchAllRows<MacroRow>(
      supabase.from('macro_series').select('series_id', { count: 'exact', head: true }).in('series_id', FRED_SERIES_IDS),
      (from, to) =>
        supabase
          .from('macro_series')
          .select('series_id, date, value')
          .in('series_id', FRED_SERIES_IDS)
          // series_id+date is the table's unique constraint, so ordering by
          // both gives a fully deterministic sort -- required for .range()
          // pagination to not skip or duplicate rows at page boundaries.
          .order('series_id', { ascending: true })
          .order('date', { ascending: true })
          .range(from, to)
    ),
    fetchAllRows<SectorRow>(
      supabase.from('sector_prices').select('symbol', { count: 'exact', head: true }).in('symbol', ALL_YAHOO_SYMBOLS),
      (from, to) =>
        supabase
          .from('sector_prices')
          .select('symbol, date, close')
          .in('symbol', ALL_YAHOO_SYMBOLS)
          .order('symbol', { ascending: true })
          .order('date', { ascending: true })
          .range(from, to)
    ),
  ])

  if (macroResult.error) {
    return NextResponse.json({ error: macroResult.error }, { status: 500 })
  }
  if (sectorResult.error) {
    return NextResponse.json({ error: sectorResult.error }, { status: 500 })
  }

  return NextResponse.json({ macroSeries: macroResult.data, sectorPrices: sectorResult.data })
}
