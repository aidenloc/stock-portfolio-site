import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabaseClient'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isValidSessionToken } from '@/lib/session'

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

  const { ticker, shares } = await request.json()

  if (!ticker || typeof ticker !== 'string') {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }

  const sharesNum = Number(shares)
  if (!sharesNum || sharesNum <= 0) {
    return NextResponse.json({ error: 'Invalid share count' }, { status: 400 })
  }

  const upperTicker = ticker.toUpperCase().trim()

  const quoteRes = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${upperTicker}&token=${process.env.FINNHUB_API_KEY}`
  )
  const quote = await quoteRes.json()
  const entryPrice = quote.c

  if (!entryPrice) {
    return NextResponse.json({ error: 'Could not get a current price for this ticker' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('paper_portfolio').insert({
    ticker: upperTicker,
    shares: sharesNum,
    entry_price: entryPrice,
    entry_date: new Date().toISOString().slice(0, 10),
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
