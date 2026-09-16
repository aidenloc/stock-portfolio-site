// Supabase/PostgREST caps a single .select() at 1000 rows. macro_series and
// sector_prices each hold years of daily data across multiple series/symbols,
// so a plain select would silently truncate the chart history. This fetches
// the exact row count first, then requests every 1000-row page via .range()
// in parallel -- fetching pages one at a time serially turned a single page
// load into dozens of round trips end to end.
const PAGE_SIZE = 1000

type PageResult<T> = { data: T[] | null; error: { message: string } | null }
type CountResult = { count: number | null; error: { message: string } | null }

export async function fetchAllRows<T>(
  countQuery: PromiseLike<CountResult>,
  buildQuery: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ data: T[]; error: string | null }> {
  const { count, error: countError } = await countQuery
  if (countError) return { data: [], error: countError.message }

  const total = count ?? 0
  if (total === 0) return { data: [], error: null }

  const pageStarts: number[] = []
  for (let from = 0; from < total; from += PAGE_SIZE) pageStarts.push(from)

  const pages = await Promise.all(
    pageStarts.map((from) => buildQuery(from, Math.min(from + PAGE_SIZE - 1, total - 1)))
  )

  const all: T[] = []
  for (const page of pages) {
    if (page.error) return { data: all, error: page.error.message }
    if (page.data) all.push(...page.data)
  }
  return { data: all, error: null }
}
