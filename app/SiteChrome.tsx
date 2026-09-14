'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Header from './Header'

// Rendered once from the root layout, so this component itself never unmounts
// across a client-side navigation between the four public routes -- that
// persistence is what lets AnimatePresence see the outgoing page's key change
// and animate its exit before the incoming page mounts. A PageTransition
// wrapper placed inside each page's own tree wouldn't work: it would unmount
// together with the page it's inside, before ever getting to animate anything.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  // /admin has its own header and max-width -- skip the public chrome and fade
  // entirely rather than double up on layout.
  if (pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  return (
    <main className="max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduceMotion ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
