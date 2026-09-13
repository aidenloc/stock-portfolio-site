import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabaseClient'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isValidSessionToken } from '@/lib/session'
import { fetchYahooHistory, periodSince, priceOnOrBefore } from '@/lib/yahooHistory'
import { fetchSector } from '@/lib/sector'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function checkAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value
  return isValidSessionToken(token)
}

export async function GET() {
  const { data, error } = await supabase
    .from('paper_portfolio')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ holdings: data ?? [] })
}

export async function POST(request: Request) {
  const isAuthed = await checkAuth()
  if (!isAuthed) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { ticker, shares, entryDate } = await request.json()

  if (!ticker || typeof ticker !== 'string') {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  const sharesNum = Number(shares)
  if (!sharesNum || sharesNum <= 0) {
    return NextResponse.json({ error: 'Invalid share count' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const resolvedEntryDate = entryDate && typeof entryDate === 'string' ? entryDate : today

  if (!DATE_RE.test(resolvedEntryDate)) {
    return NextResponse.json({ error: 'Invalid entry date' }, { status: 400 })
  }
  if (resolvedEntryDate > today) {
    return NextResponse.json({ error: 'Entry date cannot be in the future' }, { status: 400 })
  }

  const upperTicker = ticker.toUpperCase().trim()

  let entryPrice: number | undefined

  if (resolvedEntryDate === today) {
    const quoteRes = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${upperTicker}&token=${process.env.FINNHUB_API_KEY}`
    )
    const quote = await quoteRes.json()
    entryPrice = quote.c
  } else {
    try {
      const points = await fetchYahooHistory(upperTicker, periodSince(new Date(resolvedEntryDate)))
      entryPrice = priceOnOrBefore(points, resolvedEntryDate)
    } catch {
      entryPrice = undefined
    }
  }

  if (!entryPrice) {
    return NextResponse.json({ error: 'Could not find a price for this ticker on that date' }, { status: 400 })
  }

  const sector = await fetchSector(upperTicker)

  const { error } = await supabaseAdmin.from('paper_portfolio').insert({
    ticker: upperTicker,
    shares: sharesNum,
    entry_price: entryPrice,
    entry_date: resolvedEntryDate,
    sector,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const isAuthed = await checkAuth()
  if (!isAuthed) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await request.json()

  const { error } = await supabaseAdmin.from('paper_portfolio').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
