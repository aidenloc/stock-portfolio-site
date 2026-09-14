import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fetchCompanyName } from '@/lib/sector'

// Measured against this portfolio's actual holdings: a 3-day window returned 1
// raw article across all five tickers (0 surviving the relevance filter), 7 days
// returned 16 (9 kept), 14 days returned 34 (23 kept). Small caps simply don't
// generate daily coverage -- the briefing looked broken because the window was
// too narrow, not because the filter was too strict (it keeps ~68% at 14 days).
const DAYS_LOOKBACK = 14
const HEADLINES_PER_TICKER = 3
const SECTOR_STOPWORDS = new Set(['services', 'and', 'of', 'the', 'technology', 'solutions', 'industries'])

type NewsItem = {
  headline: string
  summary: string
  source: string
  url: string
  datetime: number
}

type RawArticle = { headline?: string; summary?: string; source?: string; url?: string; datetime: number }

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Whole-word, case-insensitive match — avoids e.g. ticker "MU" matching inside "Municipal".
function containsWord(text: string, word: string): boolean {
  if (!word) return false
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

// Reduces a sector name like "Financial Services" to keyword(s) worth
// searching for ("financial") — drops generic words that would match too
// broadly on their own.
function sectorKeywords(sector: string | null): string[] {
  if (!sector) return []
  return sector
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter((w) => w.length > 3 && !SECTOR_STOPWORDS.has(w))
    .map((w) => w.replace(/s$/, ''))
}

// Finnhub's company-news `related` field just echoes back the queried
// ticker regardless of whether the article is actually about that company
// (verified directly — it tagged Adobe-earnings and IMF-growth-forecast
// stories as "related" to an unconnected semiconductor holding). This is
// the actual relevance filter: keep an article only if its own text names
// the ticker/company, or names the industry this holding is in (the same
// sector shown in the homepage's "Market exposure by sector" bar).
function isRelevant(article: RawArticle, ticker: string, companyFirstWord: string | null, sectorWords: string[]): boolean {
  const text = `${article.headline ?? ''} ${article.summary ?? ''}`
  if (containsWord(text, ticker)) return true
  if (companyFirstWord && containsWord(text, companyFirstWord)) return true
  return sectorWords.some((w) => containsWord(text, w))
}

async function fetchNewsForTicker(ticker: string, companyFirstWord: string | null, sector: string | null): Promise<NewsItem[]> {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - DAYS_LOOKBACK)

  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${dateStr(from)}&to=${dateStr(to)}&token=${process.env.FINNHUB_API_KEY}`
  )
  if (!res.ok) return []

  const articles = await res.json()
  if (!Array.isArray(articles)) return []

  const words = sectorKeywords(sector)
  const seen = new Set<string>()
  const deduped: NewsItem[] = []
  for (const a of [...articles].sort((x, y) => y.datetime - x.datetime)) {
    if (!a.headline || seen.has(a.headline)) continue
    if (!isRelevant(a, ticker, companyFirstWord, words)) continue
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

  const { data: holdings, error } = await supabaseAdmin.from('paper_portfolio').select('ticker, sector')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const byTicker = new Map<string, string | null>()
  for (const h of holdings ?? []) byTicker.set(h.ticker, h.sector)
  const tickers = Array.from(byTicker.keys()).sort()

  const content = (
    await Promise.all(
      tickers.map(async (ticker) => {
        const name = await fetchCompanyName(ticker)
        const firstWord = name ? name.split(/\s+/)[0] : null
        const headlines = await fetchNewsForTicker(ticker, firstWord, byTicker.get(ticker) ?? null)
        return { ticker, headlines }
      })
    )
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
