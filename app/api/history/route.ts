import { NextResponse } from 'next/server'
import { fetchYahooHistory, type Period } from '@/lib/yahooHistory'

const VALID_PERIODS = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')
  const period = searchParams.get('period') || '1M'

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  try {
    const points = await fetchYahooHistory(ticker, period as Period)
    return NextResponse.json({ points })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch history for this ticker' }, { status: 502 })
  }
}
