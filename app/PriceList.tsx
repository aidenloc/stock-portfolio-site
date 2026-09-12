'use client'

import { useEffect, useState, useCallback } from 'react'
import StockChart from './StockChart'

type Quote = {
  price: number
  change: number
  percentChange: number
}

function isMarketOpen(): boolean {
  const now = new Date()
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = nyTime.getDay()
  const totalMinutes = nyTime.getHours() * 60 + nyTime.getMinutes()
  const isWeekday = day >= 1 && day <= 5
  const isDuringHours = totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60
  return isWeekday && isDuringHours
}

export default function PriceList({ portfolio }: { portfolio: { id: number; ticker: string }[] }) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [marketOpen, setMarketOpen] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const fetchQuotes = useCallback(async () => {
    const results: Record<string, Quote> = {}
    await Promise.all(
      portfolio.map(async (item) => {
        const res = await fetch(`/api/quote?ticker=${item.ticker}`)
        const data = await res.json()
        results[item.ticker] = data
      })
    )
    setQuotes(results)
  }, [portfolio])

  useEffect(() => {
    if (portfolio.length === 0) return
    fetchQuotes()
    setMarketOpen(isMarketOpen())
    const interval = setInterval(() => {
      const open = isMarketOpen()
      setMarketOpen(open)
      if (open) fetchQuotes()
    }, 15000)
    return () => clearInterval(interval)
  }, [portfolio, fetchQuotes])

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">
        {marketOpen ? '🟢 Market open — auto-refreshing every 15s' : '⚪ Market closed — showing last available prices'}
      </p>
      <ul className="space-y-[calc(var(--spacing-unit)*0.5rem)]">
        {portfolio.map((item) => {
          const quote = quotes[item.ticker]
          const isUp = quote && quote.change >= 0
          return (
            <li
              key={item.id}
              onClick={() => setSelectedTicker(item.ticker)}
              className="border rounded-[var(--border-radius)] px-[calc(var(--spacing-unit)*1rem)] py-[calc(var(--spacing-unit)*0.5rem)] flex justify-between items-center cursor-pointer hover:bg-[var(--color-text)]/10 text-lg"
            >
              <span>{item.ticker}</span>
              {quote ? (
                <span className={isUp ? 'text-green-500' : 'text-red-500'}>
                  ${quote.price?.toFixed(2)} ({isUp ? '+' : ''}{quote.percentChange?.toFixed(2)}%)
                </span>
              ) : (
                <span className="text-gray-400 text-sm">Loading...</span>
              )}
            </li>
          )
        })}
      </ul>

      {selectedTicker && (
        <StockChart ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}
    </div>
  )
}