'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PortfolioForm({ portfolio }: { portfolio: { id: number; ticker: string }[] }) {
  const [ticker, setTicker] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  async function handleAdd() {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, password }),
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
      body: JSON.stringify({ id, password }),
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
    <div className="mt-8 border-t pt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xl font-bold mb-3 flex items-center gap-2"
      >
        Edit Portfolio {isOpen ? '▾' : '▸'}
      </button>

      {isOpen && (
        <>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Ticker (e.g. TSLA)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="border rounded px-3 py-2 text-black bg-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded px-3 py-2 text-black bg-white"
            />
            <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded">
              Add
            </button>
          </div>
          {message && <p className="mb-3 text-sm">{message}</p>}
          <ul className="space-y-1">
            {portfolio.map((item) => (
              <li key={item.id} className="flex justify-between items-center border rounded px-3 py-1">
                <span>{item.ticker}</span>
                <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}