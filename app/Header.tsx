'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Portfolio' },
  { href: '/experience', label: 'Experience' },
  { href: '/projects', label: 'Projects' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-40 -mt-[calc(var(--spacing-unit)*2rem)] pt-[calc(var(--spacing-unit)*2rem)] pb-[calc(var(--spacing-unit)*1rem)] mb-[calc(var(--spacing-unit)*1rem)]
                 flex items-center justify-between bg-[var(--color-bg)]/85 backdrop-blur-md"
    >
      <Link href="/" className="font-bold text-lg tracking-tight">
        Aiden Loc
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? 'font-medium text-[var(--color-text)]' : 'text-gray-500 hover:text-gray-300 transition-colors'}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
