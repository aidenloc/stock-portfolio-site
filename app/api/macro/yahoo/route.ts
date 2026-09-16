import { NextResponse } from 'next/server'
import { fetchYahooChart } from '@/lib/macroYahoo'

const DEFAULT_START = '2020-01-01'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const start = searchParams.get('start') || DEFAULT_START

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  try {
    const quotes = await fetchYahooChart(symbol, start)
    return NextResponse.json(quotes)
  } catch {
    // Unofficial API -- can fail for all sorts of reasons (rate limit,
    // delisted ticker, upstream shape change). Never surface a raw throw.
    return NextResponse.json({ error: 'Failed to fetch Yahoo Finance data for this symbol' }, { status: 502 })
  }
}
