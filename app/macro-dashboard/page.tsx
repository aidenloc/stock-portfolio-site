import type { Metadata } from 'next'
import MacroDashboard from './MacroDashboard'
import Footer from '../Footer'

const DESCRIPTION =
  'Macro and cross-asset dashboard — Treasury yields, inflation vs. the fed funds rate, and sector rotation, sourced from FRED and Yahoo Finance.'

export const metadata: Metadata = {
  title: 'Macro & Markets',
  description: DESCRIPTION,
  alternates: { canonical: '/macro-dashboard' },
  // images repeated deliberately -- see the note in app/experience/page.tsx.
  openGraph: {
    title: 'Macro & Markets | Aiden Loc',
    description: DESCRIPTION,
    url: '/macro-dashboard',
    images: ['/opengraph-image'],
  },
}

export default function MacroDashboardPage() {
  return (
    <>
      <MacroDashboard />
      <Footer />
    </>
  )
}
