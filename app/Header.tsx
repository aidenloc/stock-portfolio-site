'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/experience', label: 'Experience' },
  { href: '/projects', label: 'Projects' },
]

export default function Header() {
  const pathname = usePathname()

  // gap-x-4 rather than a bare justify-between: at 375px the brand and the first
  // nav link were almost touching in the middle.
  return (
    <header className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2 mb-[calc(var(--spacing-unit)*2rem)]">
      <Link
        href="/"
        className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
      >
        Aiden Loc
      </Link>
      <nav className="flex items-center gap-4 sm:gap-6 text-sm">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              // gray-500 measured 4.19:1 against this background, under AA's 4.5
              // for text this size (same finding as the table's sort headers).
              className={
                active
                  ? 'font-medium text-[var(--color-text)]'
                  : 'text-gray-400 hover:text-[var(--color-text)] transition-colors'
              }
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
