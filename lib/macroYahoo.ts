import YahooFinance from 'yahoo-finance2'

// yahoo-finance2 v4 uses a class instance, not the old v1/v2 default-export
// singleton -- see node_modules/yahoo-finance2/skills/yahoo-finance2/SKILL.md.
const yahooFinance = new YahooFinance()

export type YahooQuote = {
  date: Date
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export async function fetchYahooChart(symbol: string, start: string): Promise<YahooQuote[]> {
  const result = await yahooFinance.chart(symbol, {
    period1: start,
    interval: '1d',
  })
  return result.quotes
}
