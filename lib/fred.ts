export type FredObservation = { date: string; value: string }

// FRED marks a missing observation (e.g. a not-yet-released month) with "."
// rather than omitting the row -- callers that coerce value to a number must
// filter these out first.
export async function fetchFredObservations(seriesId: string, start: string): Promise<FredObservation[]> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${process.env.FRED_API_KEY}` +
    `&file_type=json` +
    `&observation_start=${encodeURIComponent(start)}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`FRED request failed for ${seriesId} (${res.status})`)
  }

  const data = await res.json()
  return Array.isArray(data?.observations) ? data.observations : []
}
