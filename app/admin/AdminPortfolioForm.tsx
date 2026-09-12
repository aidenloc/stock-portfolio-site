'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPortfolioForm({ portfolio }: { portfolio: { id: number; ticker: string }[] }) {
  const [ticker, setTicker] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleAdd() {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
    } else {
      setMessage('Added!')
      setTicker('')
      router.refresh()
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch('/api/portfolio', {
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
    <div>
      <h2 className="text-xl font-bold mb-3">Manage Portfolio</h2>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Ticker (e.g. TSLA)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="border rounded px-3 py-2 text-black bg-white"
        />
        <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded">
          Add
        </button>
      </div>
      {message && <p className="mb-3 text-sm">{message}</p>}
      <ul className="space-y-1">
        {portfolio.map((item) => (
          <li key={item.id} className="flex justify-between items-center border rounded px-3 py-1 max-w-md">
            <span>{item.ticker}</span>
            <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}