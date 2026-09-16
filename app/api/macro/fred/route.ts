import { NextResponse } from 'next/server'
import { fetchFredObservations } from '@/lib/fred'

const DEFAULT_START = '2005-01-01'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const seriesId = searchParams.get('series_id')
  const start = searchParams.get('start') || DEFAULT_START

  if (!seriesId) {
    return NextResponse.json({ error: 'series_id is required' }, { status: 400 })
  }

  try {
    const observations = await fetchFredObservations(seriesId, start)
    return NextResponse.json(observations)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch FRED series' },
      { status: 502 }
    )
  }
}
