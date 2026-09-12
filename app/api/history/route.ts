import { NextResponse } from 'next/server'

const RANGE_CONFIG: Record<string, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  YTD: { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')
  const period = searchParams.get('period') || '1M'

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  const config = RANGE_CONFIG[period]
  if (!config) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${config.range}&interval=${config.interval}`

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 502 })
  }

  const data = await res.json()
  const result = data?.chart?.result?.[0]

  if (!result) {
    return NextResponse.json({ error: 'No data found for this ticker' }, { status: 404 })
  }

  const timestamps: number[] = result.timestamp || []
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []

  const points = timestamps
    .map((t, i) => ({ time: t, price: closes[i] }))
    .filter((p) => p.price !== null && p.price !== undefined)

  return NextResponse.json({ points })
}