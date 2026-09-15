'use client'

import { useEffect, useState } from 'react'
import Card from './Card'

type EarningsEvent = {
  ticker: string
  companyName: string | null
  date: string
  hour: string | null
  quarter: number | null
  year: number | null
  epsEstimate: number | null
  revenueEstimate: number | null
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

// Finnhub's free tier only gives before/after/during-market-hours, not an
// exact clock time — labeling it honestly rather than inventing a time.
function hourLabel(hour: string | null): string | null {
  if (hour === 'bmo') return 'Before Market Open'
  if (hour === 'amc') return 'After Market Close'
  if (hour === 'dmh') return 'During Market Hours'
  return null
}

function dateBadge(dateStr: string): { weekday: string; day: string } {
  const d = new Date(`${dateStr}T00:00:00`)
  return {
    weekday: d.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
    day: d.toLocaleDateString([], { day: 'numeric' }),
  }
}

function googleCalendarLink(event: EarningsEvent): string {
  const start = event.date.replace(/-/g, '')
  const endDate = new Date(`${event.date}T00:00:00Z`)
  endDate.setUTCDate(endDate.getUTCDate() + 1)
  const end = endDate.toISOString().slice(0, 10).replace(/-/g, '')

  const name = event.companyName || event.ticker
  const title = encodeURIComponent(`${name} Earnings${event.quarter ? ` (Q${event.quarter} ${event.year})` : ''}`)
  const detailsParts = []
  if (event.epsEstimate != null) detailsParts.push(`EPS est. $${event.epsEstimate.toFixed(2)}`)
  if (event.revenueEstimate != null) detailsParts.push(`Revenue est. ${formatCompact(event.revenueEstimate)}`)
  const details = encodeURIComponent(detailsParts.join(', '))

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`
}

export default function EarningsCalendar() {
  const [events, setEvents] = useState<EarningsEvent[] | null>(null)

  useEffect(() => {
    fetch('/api/earnings-calendar')
      .then((res) => res.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
  }, [])

  if (!events || events.length === 0) return null

  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-[var(--color-text)]/45 mb-4">Upcoming Earnings</p>
      <div className="space-y-4">
        {events.map((e, i) => {
          const { weekday, day } = dateBadge(e.date)
          const hour = hourLabel(e.hour)
          return (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 w-11 rounded-[var(--border-radius)] bg-[var(--color-bg)] text-center py-1.5">
                <p className="text-[10px] text-[var(--color-text)]/45 leading-none">{weekday}</p>
                <p className="text-base font-semibold leading-tight mt-0.5">{day}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{e.companyName || e.ticker}</p>
                {hour && <p className="text-xs text-[var(--color-text)]/45">{hour}</p>}
                <p className="text-xs text-[var(--color-text)]/45 mt-0.5">
                  {e.quarter && `Q${e.quarter} ${e.year}`}
                  {e.epsEstimate != null && ` · EPS est. $${e.epsEstimate.toFixed(2)}`}
                  {e.revenueEstimate != null && ` · Rev est. ${formatCompact(e.revenueEstimate)}`}
                </p>
                <a
                  href={googleCalendarLink(e)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  + Add to calendar
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
