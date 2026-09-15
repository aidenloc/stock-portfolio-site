import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from './Footer'
import ContactLinks from './ContactLinks'
import PortfolioPreviewCard from './PortfolioPreviewCard'
import { CardCta } from './CardCta'
import { POSITIONING } from '@/lib/siteContent'
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
}: {
  eyebrow: string
  title: string
  body: string
  cta: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-[var(--border-radius)] bg-[var(--color-card)]
                 p-[calc(var(--spacing-unit)*2.25rem)] border border-[var(--color-primary)]/15
                 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_32px_-16px_rgba(0,0,0,0.45)]
                 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30
                 hover:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_20px_40px_-16px_rgba(0,0,0,0.55)]"
    >
      <p className="text-xs uppercase tracking-widest text-[var(--color-text)]/45 mb-3">{eyebrow}</p>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text)]/60 mb-4 leading-relaxed">{body}</p>
      <CardCta label={cta} />
    </Link>
  )
}

export default function Home() {
  const project = PROJECTS[0]

  return (
    <>
      {/* Hero */}
      <section className="max-w-3xl mt-10 mb-20">
        <h1 className="font-serif font-semibold tracking-tight text-6xl sm:text-7xl mb-5">Aiden Loc</h1>
        <p className="text-lg text-[var(--color-text)]/85 mb-8 leading-relaxed">{POSITIONING}</p>
        <ContactLinks />
      </section>

      {/* Preview cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <PortfolioPreviewCard />
        <PreviewCard
          eyebrow="Experience"
          title={CURRENT_ROLE.role}
          body={`${CURRENT_ROLE.org} · ${CURRENT_ROLE.dates}`}
          cta="View full experience"
          href="/experience"
        />
        <PreviewCard
          eyebrow="Projects"
          title={project.title}
          body={project.teaser}
          cta="Read more"
          href={project.href}
        />
      </section>

      <Footer />
    </>
  )
}
