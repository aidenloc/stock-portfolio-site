import type { Metadata } from 'next'
import PaperPortfolio from './PaperPortfolio'
import Header from './Header'
import Footer from './Footer'

const DESCRIPTION =
  'A simulated equity portfolio tracked against the S&P 500 — holdings, allocation, time-weighted performance, and the thesis behind each position.'

export const metadata: Metadata = {
  // `absolute` because a root layout's title.template applies to child segments,
  // and app/page.tsx is the *same* segment as app/layout.tsx -- a plain string
  // here renders as a bare "Portfolio" with no name attached.
  title: { absolute: 'Aiden Loc — Paper Portfolio & Equity Research' },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Aiden Loc — Paper Portfolio & Equity Research',
    description: DESCRIPTION,
    url: '/',
  },
}

export default function Home() {
  return (
    <main className="max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />
      <PaperPortfolio />
      <Footer />
    </main>
  )
}
