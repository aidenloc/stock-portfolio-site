'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Home occupies the top-left slot on its own; the rest sit in the right-hand
// group. It isn't repeated in NAV_LINKS -- one link per destination.
const HOME = { href: '/', label: 'Home' }

const NAV_LINKS = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/experience', label: 'Experience' },
  { href: '/projects', label: 'Projects' },
]

// Matches SiteChrome's exit duration (180ms) plus a small buffer for timer
// jitter. See SiteChrome.tsx for why this exists: without it, a second click
// fired before the first page's exit animation finishes can start a second,
// overlapping transition -- and under enough of those in quick succession,
// nav and content could end up on different pages with no bound on how far
// apart. Locking clicks for one exit's worth of time means only one
// transition is ever in flight, so that drift can't happen.
const NAV_LOCK_MS = 200

export default function Header() {
  const pathname = usePathname()
  const [locked, setLocked] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Don't lock on mount -- only on an actual route change.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setLocked(true)
    const timer = setTimeout(() => setLocked(false), NAV_LOCK_MS)
    return () => clearTimeout(timer)
  }, [pathname])

  // /60 opacity on the warm ivory text measures ~6.4:1 against this
  // background -- comfortably AA-compliant and, unlike a fixed Tailwind
  // gray, warm by construction since it's the same ivory blended with the
  // (also warm) page background rather than a separate cool-neutral tone.
  const linkClass = (active: boolean) =>
    active
      ? 'font-medium text-[var(--color-text)]'
      : 'text-[var(--color-text)]/60 hover:text-[var(--color-text)] transition-colors'

  const guardClick = (e: React.MouseEvent) => {
    if (locked) e.preventDefault()
  }

  // gap-x-4 rather than a bare justify-between: at 375px the left link and the
  // first nav link were almost touching in the middle.
  return (
    <header className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2 mb-[calc(var(--spacing-unit)*2rem)]">
      <Link
        href={HOME.href}
        aria-current={pathname === HOME.href ? 'page' : undefined}
        onClick={guardClick}
        className={`text-lg tracking-tight ${
          pathname === HOME.href
            ? 'font-bold text-[var(--color-text)]'
            : 'font-bold text-[var(--color-text)]/60 hover:text-[var(--color-text)] transition-colors'
        }`}
      >
        {HOME.label}
      </Link>
      <nav className="flex items-center gap-4 sm:gap-6 text-sm">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              onClick={guardClick}
              className={linkClass(active)}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
