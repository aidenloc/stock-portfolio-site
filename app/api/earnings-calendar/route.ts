import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { fetchCompanyName } from '@/lib/sector'

const DAYS_AHEAD = 90
const MAX_EVENTS = 10

type EarningsEvent = {
  ticker: string
  companyName: string | null
  date: string
  hour: string | null
  quarter: number | null
  year: number | null
  epsEstimate: number | null
  revenueEstimate: number | null
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchEarningsForTicker(ticker: string): Promise<EarningsEvent[]> {
  const from = new Date()
  const to = new Date()
  to.setDate(to.getDate() + DAYS_AHEAD)

  const res = await fetch(
    `https://finnhub.io/api/v1/calendar/earnings?from=${dateStr(from)}&to=${dateStr(to)}&symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`
  )
  if (!res.ok) return []

  const data = await res.json()
  const entries = data?.earningsCalendar
  if (!Array.isArray(entries)) return []

  return entries.map((e) => ({
    ticker,
    companyName: null,
    date: e.date,
    hour: e.hour ?? null,
    quarter: e.quarter ?? null,
    year: e.year ?? null,
    epsEstimate: e.epsEstimate ?? null,
    revenueEstimate: e.revenueEstimate ?? null,
  }))
}

// No caching here (unlike the daily briefing) — earnings-calendar entries
// rarely change within a day, and this is only a handful of Finnhub calls
// per page load (one per portfolio ticker), well within the free-tier limit.
export async function GET() {
  const { data: holdings, error } = await supabase.from('paper_portfolio').select('ticker')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tickers = Array.from(new Set((holdings ?? []).map((h) => h.ticker)))

  const nested = await Promise.all(
    tickers.map(async (ticker) => {
      const [events, name] = await Promise.all([fetchEarningsForTicker(ticker), fetchCompanyName(ticker)])
      return events.map((e) => ({ ...e, companyName: name }))
    })
  )

  const events = nested
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_EVENTS)

  return NextResponse.json({ events })
}
