import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const DAYS_LOOKBACK = 3
const HEADLINES_PER_TICKER = 4

type NewsItem = {
  headline: string
  summary: string
  source: string
  url: string
  datetime: number
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchNewsForTicker(ticker: string): Promise<NewsItem[]> {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - DAYS_LOOKBACK)

  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${dateStr(from)}&to=${dateStr(to)}&token=${process.env.FINNHUB_API_KEY}`
  )
  if (!res.ok) return []

  const articles = await res.json()
  if (!Array.isArray(articles)) return []

  const seen = new Set<string>()
  const deduped: NewsItem[] = []
  for (const a of [...articles].sort((x, y) => y.datetime - x.datetime)) {
    if (!a.headline || seen.has(a.headline)) continue
    seen.add(a.headline)
    deduped.push({
      headline: a.headline,
      summary: a.summary || '',
      source: a.source || '',
      url: a.url || '',
      datetime: a.datetime,
    })
    if (deduped.length >= HEADLINES_PER_TICKER) break
  }
  return deduped
}

// Triggered once a day by Vercel Cron (see vercel.json). Snapshots whichever
// tickers are in paper_portfolio *right now* — a ticker added after this run
// won't show up in the briefing until tomorrow's run, by design.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: holdings, error } = await supabaseAdmin.from('paper_portfolio').select('ticker')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tickers = Array.from(new Set((holdings ?? []).map((h) => h.ticker))).sort()

  const content = (
    await Promise.all(tickers.map(async (ticker) => ({ ticker, headlines: await fetchNewsForTicker(ticker) })))
  ).filter((entry) => entry.headlines.length > 0)

  const { error: upsertError } = await supabaseAdmin.from('daily_briefing').upsert({
    id: 1,
    briefing_date: dateStr(new Date()),
    content,
    updated_at: new Date().toISOString(),
  })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, tickers: tickers.length, withNews: content.length })
}
