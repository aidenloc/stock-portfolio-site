import type { Metadata } from 'next'
import PaperPortfolio from '../PaperPortfolio'
import Header from '../Header'
import Footer from '../Footer'

const DESCRIPTION =
  'A simulated equity portfolio tracked against the S&P 500 — holdings, allocation, time-weighted performance, and the thesis behind each position.'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: DESCRIPTION,
  alternates: { canonical: '/portfolio' },
  // images repeated deliberately -- see the note in app/experience/page.tsx.
  openGraph: {
    title: 'Portfolio | Aiden Loc',
    description: DESCRIPTION,
    url: '/portfolio',
    images: ['/opengraph-image'],
  },
}

export default function PortfolioPage() {
  return (
    <main className="max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />
      <PaperPortfolio />
      <Footer />
    </main>
  )
}
