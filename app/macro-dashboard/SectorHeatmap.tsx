'use client'

import { useState } from 'react'
import {
  ASSET_LABELS,
  ASSET_CLASS,
  ASSET_CLASS_FILTERS,
  TRAILING_PERIODS,
  type AssetClassFilter,
  type TrailingReturns,
} from '@/lib/macro'

export type HeatmapRow = { symbol: string; returns: TrailingReturns }

// Diverging green/red by return magnitude (site's established up/down
// colors -- see StockChart's line color), intensity scaled by |pct| and
// capped at 15% so an outlier doesn't wash out every other cell.
function cellColor(pct: number | null): string {
  if (pct === null) return 'transparent'
  const magnitude = Math.min(Math.abs(pct), 15) / 15
  const alpha = 0.12 + magnitude * 0.55
  return pct >= 0 ? `rgba(34,197,94,${alpha})` : `rgba(239,68,68,${alpha})`
}

const signedPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

export default function SectorHeatmap({ rows }: { rows: HeatmapRow[] }) {
  const [filter, setFilter] = useState<AssetClassFilter>('All')

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-text)]/60 py-8 text-center">No sector price data cached yet.</p>
  }

  const filtered = rows.filter((r) => filter === 'All' || ASSET_CLASS[r.symbol] === filter)
  // Sorted by YTD leader-to-laggard, which is the point of a rotation view --
  // nulls (not enough history yet) sort last rather than to the top.
  const sorted = [...filtered].sort((a, b) => (b.returns.ytd ?? -Infinity) - (a.returns.ytd ?? -Infinity))

  return (
    <div>
      <div
        className="inline-flex bg-[var(--color-bg)] rounded-full p-1 gap-1 mb-4 flex-wrap"
        role="group"
        aria-label="Asset class filter"
      >
        {ASSET_CLASS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
              filter === f
                ? 'bg-[var(--color-primary)] text-[var(--color-bg)]'
                : 'text-[var(--color-text)]/60 hover:text-[var(--color-text)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">
            Trailing returns by asset across 1-month, 3-month, 6-month, and year-to-date windows, sorted by YTD return.
          </caption>
          <thead>
            <tr className="border-b border-[var(--color-text)]/10">
              <th scope="col" className="px-3 py-2 text-left font-normal text-xs uppercase tracking-wide text-[var(--color-text)]/45">
                Asset
              </th>
              {TRAILING_PERIODS.map((p) => (
                <th
                  key={p.key}
                  scope="col"
                  className="px-3 py-2 text-right font-normal text-xs uppercase tracking-wide text-[var(--color-text)]/45"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.symbol} className="border-b border-[var(--color-text)]/5">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="font-semibold">{row.symbol}</span>
                  <span className="text-[var(--color-text)]/45 ml-1.5 text-xs">{ASSET_LABELS[row.symbol] ?? ''}</span>
                </td>
                {TRAILING_PERIODS.map((p) => {
                  const pct = row.returns[p.key]
                  return (
                    <td key={p.key} className="px-1 py-1.5">
                      <div
                        className="rounded-[var(--border-radius)] text-right px-2.5 py-1.5 tabular-nums font-medium"
                        style={{ backgroundColor: cellColor(pct) }}
                      >
                        {pct === null ? <span className="text-[var(--color-text)]/35">—</span> : signedPct(pct)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
