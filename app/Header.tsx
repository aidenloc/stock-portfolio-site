'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Home occupies the top-left slot on its own; the rest sit in the right-hand
// group. It isn't repeated in NAV_LINKS -- one link per destination.
const HOME = { href: '/', label: 'Home' }

const NAV_LINKS = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/experience', label: 'Experience' },
  { href: '/projects', label: 'Projects' },
]

export default function Header() {
  const pathname = usePathname()

  // gray-500 measured 4.19:1 against this background, under AA's 4.5 for text
  // this size (same finding as the holdings table's sort headers).
  const linkClass = (active: boolean) =>
    active
      ? 'font-medium text-[var(--color-text)]'
      : 'text-gray-400 hover:text-[var(--color-text)] transition-colors'

  // gap-x-4 rather than a bare justify-between: at 375px the left link and the
  // first nav link were almost touching in the middle.
  return (
    <header className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2 mb-[calc(var(--spacing-unit)*2rem)]">
      <Link
        href={HOME.href}
        aria-current={pathname === HOME.href ? 'page' : undefined}
        className={`text-lg tracking-tight ${
          pathname === HOME.href
            ? 'font-bold text-[var(--color-text)]'
            : 'font-bold text-gray-400 hover:text-[var(--color-text)] transition-colors'
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
