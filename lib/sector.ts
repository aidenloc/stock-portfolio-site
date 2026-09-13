// Best-effort sector/industry lookup via Finnhub's free company-profile
// endpoint. Callers are expected to persist the result (paper_portfolio.sector)
// so this only runs once per ticker rather than on every page load.
export async function fetchSector(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.finnhubIndustry || null
  } catch {
    return null
  }
}

// Best-effort company name lookup (same endpoint) — used by the daily
// briefing to check whether a news article's text actually names the
// company, since Finnhub's company-news `related` field tags every result
// with the queried ticker regardless of real relevance.
export async function fetchCompanyName(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.name || null
  } catch {
    return null
  }
}
