import type { Metadata } from 'next'
import { ViewTransition } from 'react'
import Link from 'next/link'
import Header from './Header'
import Footer from './Footer'
import ContactLinks from './ContactLinks'
import PortfolioPreviewCard from './PortfolioPreviewCard'
import { ArrowIcon } from './icons'
import { POSITIONING, THESIS } from '@/lib/siteContent'
import { CURRENT_ROLE } from '@/lib/experience'
import { PROJECTS } from '@/lib/projects'

const DESCRIPTION =
  'Aiden Loc — business student working at the intersection of finance and software. Paper portfolio, equity research, and engineering projects.'

export const metadata: Metadata = {
  // `absolute` because a root layout's title.template applies to child segments,
  // and app/page.tsx is the *same* segment as app/layout.tsx -- a plain string
  // here renders as a bare title with no name attached.
  title: { absolute: 'Aiden Loc — Finance & Software' },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Aiden Loc — Finance & Software',
    description: DESCRIPTION,
    url: '/',
  },
}

function PreviewCard({
  eyebrow,
  title,
  body,
  cta,
  href,
  transitionName,
}: {
  eyebrow: string
  title: string
  body: string
  cta: string
  href: string
  transitionName: string
}) {
  return (
    // Pairs with the matching name on the destination page's hero, so the card
    // morphs into it. share="morph" must accompany default="none" -- without the
    // explicit share, the pair silently stops morphing.
    <ViewTransition name={transitionName} share="morph" default="none">
      <Link
        href={href}
        className="group bg-[var(--color-card)] rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1.5rem)]
                   border border-transparent hover:border-[var(--color-text)]/15 transition-colors flex flex-col"
      >
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">{eyebrow}</p>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{body}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400 group-hover:text-[var(--color-text)] transition-colors">
          {cta} <ArrowIcon />
        </span>
      </Link>
    </ViewTransition>
  )
}

export default function Home() {
  const project = PROJECTS[0]

  return (
    <main className="max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />

      {/* Hero */}
      <section className="max-w-3xl mt-8 mb-14">
        <h1 className="text-5xl sm:text-6xl font-bold mb-4">Aiden Loc</h1>
        <p className="text-lg text-gray-300 mb-6">{POSITIONING}</p>
        <ContactLinks />
      </section>

      {/* Thesis */}
      <section className="max-w-3xl mb-16">
        <p className="text-sm text-gray-400 leading-relaxed">{THESIS}</p>
      </section>

      {/* Preview cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <PortfolioPreviewCard />
        <PreviewCard
          eyebrow="Experience"
          title={CURRENT_ROLE.role}
          body={`${CURRENT_ROLE.org} · ${CURRENT_ROLE.dates}`}
          cta="View full experience"
          href="/experience"
          transitionName="experience-hero"
        />
        <PreviewCard
          eyebrow="Projects"
          title={project.title}
          body={project.teaser}
          cta="Read more"
          href={project.href}
          transitionName="projects-hero"
        />
      </section>

      <Footer />
    </main>
  )
}
