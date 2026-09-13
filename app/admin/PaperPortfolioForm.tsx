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

const inputClasses =
  'bg-[var(--color-bg)] border border-[var(--color-text)]/15 rounded-[var(--border-radius)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-primary)]/60'

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-[var(--border-radius)] text-sm font-medium hover:opacity-90 transition-opacity"
    >
      {children}
    </button>
  )
}

function EditRow({
  holding,
  onCancel,
  onSaved,
}: {
  holding: Holding
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const [ticker, setTicker] = useState(holding.ticker)
  const [shares, setShares] = useState(String(holding.shares))
  const [entryDate, setEntryDate] = useState(holding.entry_date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/paper-portfolio', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: holding.id, ticker, shares, entryDate }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error)
    } else {
      onSaved('Updated!')
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-[var(--border-radius)] bg-[var(--color-text)]/5">
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        className={`${inputClasses} w-24`}
      />
      <input
        type="number"
        value={shares}
        onChange={(e) => setShares(e.target.value)}
        className={`${inputClasses} w-24`}
      />
      <input
        type="date"
        value={entryDate}
        max={today()}
        onChange={(e) => setEntryDate(e.target.value)}
        className={inputClasses}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-medium text-[var(--color-primary)] hover:opacity-80 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-300">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </div>
  )
}

export default function PaperPortfolioForm({ holdings }: { holdings: Holding[] }) {
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [entryDate, setEntryDate] = useState(today)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
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
    <div>
      <h2 className="text-xl font-bold mb-1">Paper Portfolio</h2>
      <p className="text-sm text-gray-400 mb-4">
        Entry date defaults to today (live price). Pick an earlier date to back-date a position — the entry
        price is that day&apos;s closing price from Yahoo Finance.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Ticker (e.g. AAPL)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className={inputClasses}
        />
        <input
          type="number"
          placeholder="Shares"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className={`${inputClasses} w-28`}
        />
        <input
          type="date"
          value={entryDate}
          max={today()}
          onChange={(e) => setEntryDate(e.target.value)}
          className={inputClasses}
        />
        <AddButton onClick={handleAdd}>Add</AddButton>
      </div>
      {message && <p className="mb-3 text-sm text-gray-400">{message}</p>}
      <div className="space-y-1">
        {holdings.map((h) =>
          editingId === h.id ? (
            <EditRow
              key={h.id}
              holding={h}
              onCancel={() => setEditingId(null)}
              onSaved={(msg) => {
                setMessage(msg)
                setEditingId(null)
              }}
            />
          ) : (
            <div
              key={h.id}
              className="flex justify-between items-center px-4 py-3 rounded-[var(--border-radius)] hover:bg-[var(--color-text)]/5 transition-colors"
            >
              <span className="text-sm">
                <span className="font-semibold">{h.ticker}</span> — {h.shares} sh @ $
                {Number(h.entry_price).toFixed(2)} ({h.entry_date})
              </span>
              <span className="flex items-center gap-4">
                <button
                  onClick={() => setEditingId(h.id)}
                  className="text-xs text-gray-400 hover:text-[var(--color-text)]"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(h.id)} className="text-xs text-red-400 hover:text-red-300">
                  Remove
                </button>
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
