export type HistoryPoint = { time: number; price: number }

const RANGE_CONFIG = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' },
  '6M': { range: '6mo', interval: '1d' },
  YTD: { range: 'ytd', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  '5Y': { range: '5y', interval: '1wk' },
} as const

export type Period = keyof typeof RANGE_CONFIG

export async function fetchYahooHistory(ticker: string, period: Period): Promise<HistoryPoint[]> {
  const config = RANGE_CONFIG[period]
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${config.range}&interval=${config.interval}`

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch history')
  }

  const data = await res.json()
  const result = data?.chart?.result?.[0]

  if (!result) {
    throw new Error('No data found for this ticker')
  }

  const timestamps: number[] = result.timestamp || []
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []

  return timestamps
    .map((t, i) => ({ time: t, price: closes[i] }))
    .filter((p): p is HistoryPoint => p.price !== null && p.price !== undefined)
}

// Picks the smallest Yahoo range that still covers a given start date, since
// Yahoo only accepts a fixed set of range buckets rather than arbitrary date spans.
export function periodSince(startDate: Date): Period {
  const days = (Date.now() - startDate.getTime()) / 86_400_000
  if (days <= 5) return '5D'
  if (days <= 30) return '1M'
  if (days <= 180) return '6M'
  if (days <= 365) return '1Y'
  return '5Y'
}

export function dateKey(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}
