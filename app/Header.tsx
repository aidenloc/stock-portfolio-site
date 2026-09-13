'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Portfolio' },
  { href: '/aiden', label: 'Aiden' },
  { href: '/projects', label: 'Projects' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="flex items-center justify-between mb-[calc(var(--spacing-unit)*2rem)]">
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
