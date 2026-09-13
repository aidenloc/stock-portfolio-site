'use client'

import { useEffect, useState } from 'react'

type NewsItem = { headline: string; summary: string; source: string; url: string; datetime: number }
type TickerBriefing = { ticker: string; headlines: NewsItem[] }
type Briefing = { briefing_date: string | null; content: TickerBriefing[] }

function formatBriefingDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString([], { month: 'long', day: 'numeric' })
}

export default function DailyBriefing() {
  const [data, setData] = useState<Briefing | null>(null)

  useEffect(() => {
    fetch('/api/daily-briefing')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null))
  }, [])

  if (!data || !data.content || data.content.length === 0) return null

  return (
    <div className="bg-[var(--color-card)] rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1.25rem)] lg:sticky lg:top-6">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Daily Briefing</p>
      {data.briefing_date && <p className="text-xs text-gray-600 mb-4">{formatBriefingDate(data.briefing_date)}</p>}

      <div className="space-y-5">
        {data.content.map((tb) => (
          <div key={tb.ticker}>
            <p className="text-sm font-semibold mb-2">{tb.ticker}</p>
            <ul className="space-y-2.5">
              {tb.headlines.map((h, i) => (
                <li key={i}>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm leading-snug hover:underline block"
                  >
                    {h.headline}
                  </a>
                  <p className="text-xs text-gray-500 mt-0.5">{h.source}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
