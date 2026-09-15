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
//
// mode="wait" (not "sync"/"popLayout") is required here. "popLayout" was
// tried and reverted: it pops the exiting page out of flow by measuring and
// setting explicit position/width via injected CSS, which assumes reasonably
// uniform children -- on a page whose top-level content is a Fragment of
// differently-sized sections (hero at max-w-3xl, a 3-column card grid, etc.)
// that measurement came out wrong, and the entering page rendered at 672px
// instead of the ~1216px content width, visibly doubled and offset from the
// outgoing page's own last-known position. Confirmed via computed styles
// mid-transition, not by eye.
//
// The flash/flicker bug: Header reads the pathname directly, which updates
// the instant a link is clicked -- no animation gates it. The content pane,
// under mode="wait", does not mount the new page until the previous page's
// ~180ms exit fully finishes. On a single click this just means the nav
// label updates up to ~180ms before the new content is visible -- the old
// page is still shown, correctly fading out, so there's nothing "flashed."
// The actual bug only shows up on rapid repeated clicks: two tried fixes
// (delaying the nav label via a ref read in onExitComplete; then a unified
// snapshot state driving both nav and content) each removed the nav/content
// mismatch but introduced worse regressions -- the ref-read version still
// raced under 3+ clicks, and the snapshot version caused the Portfolio page
// to visibly double-mount and restart its own data fetch/count-up mid
// transition. That double-mount turned out to be pre-existing and unrelated
// to either fix attempt: it reproduces on a single, isolated click, with no
// rapid clicking at all, on the already-deployed fade-transition code --
// confirmed via a console instance-counter (two separate mount/unmount
// cycles logged for one click) and duplicate /api/paper-portfolio/performance
// requests network-captured ~190ms apart. It's specifically AnimatePresence
// causing it: a plain `motion.div key={pathname}` with no AnimatePresence
// wrapper mounts once; adding AnimatePresence back (any mode, with or
// without initial={false}, with or without the root layout's force-dynamic,
// with or without freezing the children reference per-route via useMemo)
// reproduces the double mount every time. That's a separate, deeper bug in
// how AnimatePresence's children reconcile against this app's Server
// Component tree -- flagged for the user rather than chased further here.
//
// Fix (for the reported bug): Header locks its own links for the duration
// of one transition (see Header.tsx) so a second click physically can't
// register until the first page has fully settled. That bounds the
// nav-ahead-of-content gap to the same single, harmless ~180ms window every
// isolated click already has, and makes the unbounded rapid-click drift
// structurally impossible rather than something to reconcile after the fact.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  // /admin has its own header and max-width -- skip the public chrome and fade
  // entirely rather than double up on layout.
  if (pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  return (
    // w-full is load-bearing: <body> is a flex column, and a flex item with
    // mx-auto but no explicit width shrink-wraps to its own content's natural
    // width instead of stretching to fill -- harmless on Home/Portfolio,
    // whose content is wide enough to hit the available width anyway, but on
    // Experience/Projects (entirely max-w-3xl content) the whole <main>,
    // header included, shrank to ~768px and centered, so the nav bar visibly
    // jumped sideways on every navigation between a wide and a narrow page.
    <main className="w-full max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
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
