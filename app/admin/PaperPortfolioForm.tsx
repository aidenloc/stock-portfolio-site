'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Holding = {
  id: number
  ticker: string
  shares: number
  entry_price: number
  entry_date: string
}

const today = () => new Date().toISOString().slice(0, 10)

export default function PaperPortfolioForm({ holdings }: { holdings: Holding[] }) {
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [entryDate, setEntryDate] = useState(today)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleAdd() {
    const res = await fetch('/api/paper-portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, shares, entryDate }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
    } else {
      setMessage(entryDate === today() ? "Added at today's price!" : `Added at the ${entryDate} closing price!`)
      setTicker('')
      setShares('')
      setEntryDate(today())
      router.refresh()
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch('/api/paper-portfolio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
    } else {
      setMessage('Deleted!')
      router.refresh()
    }
  }

  return (
    <div className="border-t pt-6 mt-8">
      <h2 className="text-xl font-bold mb-3">Paper Portfolio (Performance Tracker)</h2>
      <p className="text-sm text-gray-400 mb-3">
        Entry date defaults to today (live price). Pick an earlier date to back-date a position — the entry
        price is that day&apos;s closing price from Yahoo Finance.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Ticker (e.g. AAPL)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="border rounded px-3 py-2 text-black bg-white"
        />
        <input
          type="number"
          placeholder="Shares"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className="border rounded px-3 py-2 text-black bg-white w-28"
        />
        <input
          type="date"
          value={entryDate}
          max={today()}
          onChange={(e) => setEntryDate(e.target.value)}
          className="border rounded px-3 py-2 text-black bg-white"
        />
        <button onClick={handleAdd} className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-[var(--border-radius)]">
          Add
        </button>
      </div>
      {message && <p className="mb-3 text-sm">{message}</p>}
      <ul className="space-y-1">
        {holdings.map((h) => (
          <li key={h.id} className="flex justify-between items-center border rounded px-3 py-1 max-w-md">
            <span>
              {h.ticker} — {h.shares} sh @ ${Number(h.entry_price).toFixed(2)} ({h.entry_date})
            </span>
            <button onClick={() => handleDelete(h.id)} className="text-red-500 text-sm">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
