import type { Metadata } from 'next'
import Footer from '../Footer'
import ContactLinks from '../ContactLinks'
import { ArrowIcon } from '../icons'
import { allEntriesByMostRecent, KIND_LABEL, type ExperienceEntry } from '@/lib/experience'

const DESCRIPTION =
  'Aiden Loc — education, work experience, certifications, and technical skills. Business Administration at University at Buffalo.'

export const metadata: Metadata = {
  title: 'Experience',
  description: DESCRIPTION,
  alternates: { canonical: '/experience' },
  // openGraph doesn't inherit this segment's own `title`; without setting it
  // here every route shares the root's og:title when shared on LinkedIn.
  // `images` must be repeated too: declaring openGraph in a child segment
  // REPLACES the parent's object, which drops the image that app/opengraph-image.tsx
  // contributes to the root -- verified by og:image going null here without it.
  openGraph: {
    title: 'Experience | Aiden Loc',
    description: DESCRIPTION,
    url: '/experience',
    images: ['/opengraph-image'],
  },
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-8 mt-16 first:mt-0">
      <span className="text-sm text-gray-600">{number}</span>
      <div className="flex-1 h-px bg-[var(--color-text)]/15" />
      <span className="text-xs uppercase tracking-widest text-gray-500">{title}</span>
    </div>
  )
}

// One node on the unified timeline. The connecting line is drawn per-entry and
// omitted on the last one, so the thread ends at the final dot instead of
// trailing off past it.
function TimelineEntry({ entry, isLast }: { entry: ExperienceEntry; isLast: boolean }) {
  return (
    <li className="relative pl-8 pb-10 last:pb-0">
      {!isLast && (
        <span aria-hidden className="absolute left-[5px] top-4 bottom-0 w-px bg-[var(--color-text)]/15" />
      )}
      <span
        aria-hidden
        className="absolute left-0 top-[5px] w-[11px] h-[11px] rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-bg)]"
      />

      {/* flex-wrap matters at phone width: the dates carry whitespace-nowrap, so
          holding them on the same line as the org forced a 334px min-content and
          pushed the page past a 390px viewport. Wrapping lets them drop below. */}
      <div className="flex flex-wrap justify-between items-baseline gap-x-4">
        <h3 className="font-semibold">{entry.org}</h3>
        <span className="text-xs text-gray-500 whitespace-nowrap">{entry.location}</span>
      </div>
      <div className="flex flex-wrap justify-between items-baseline gap-x-4 mb-2">
        <p className="text-sm italic text-gray-400">
          {entry.role}
          <span className="not-italic text-[10px] uppercase tracking-widest text-gray-600 ml-2">
            {KIND_LABEL[entry.kind]}
          </span>
        </p>
        <span className="text-xs text-gray-500 whitespace-nowrap">{entry.dates}</span>
      </div>
      <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm text-gray-400">
        {entry.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </li>
  )
}

// Stylized (not literal) issuer marks -- monogram badges in the site's own
// theme colors rather than a reproduction of either company's real logo.
function GoogleMark() {
  return (
    <div className="w-9 h-9 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold text-base">
      G
    </div>
  )
}

function IBMMark() {
  return (
    <div className="w-9 h-9 rounded-[var(--border-radius)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold text-[10px] tracking-tight">
      IBM
    </div>
  )
}

function CertificationCard({
  icon,
  name,
  issuer,
  url,
}: {
  icon: React.ReactNode
  name: string
  issuer: string
  url: string
}) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*1.75rem)] border border-transparent hover:border-[var(--color-text)]/10 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-xl mb-1">{name}</h3>
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-5">{issuer}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400 hover:text-[var(--color-text)] transition-colors"
      >
        View Certificate <ArrowIcon />
      </a>
    </div>
  )
}

export default function ExperiencePage() {
  return (
    <>
      <div className="max-w-3xl mb-16">
        <h1 className="text-6xl font-bold mb-4">Aiden Loc</h1>
        <ContactLinks />
      </div>

      <div className="max-w-3xl">
        {/* Education, work and extracurriculars share one chronological thread
            rather than three separately-labelled stacks; each entry keeps a small
            kind label so the distinction isn't lost in the merge. */}
        <SectionHeading number="01" title="Timeline" />
        <ol className="mb-8">
          {allEntriesByMostRecent().map((e, i, arr) => (
            <TimelineEntry key={e.org} entry={e} isLast={i === arr.length - 1} />
          ))}
        </ol>

        <SectionHeading number="02" title="Certifications" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <CertificationCard
            icon={<IBMMark />}
            name="Getting Started with Generative AI"
            issuer="IBM"
            url="https://www.credly.com/badges/d2906cd3-1845-49f2-9188-52673d1da0cd/public_url"
          />
          <CertificationCard
            icon={<GoogleMark />}
            name="AI Essentials"
            issuer="Google"
            url="https://www.credly.com/badges/eef651b8-a4fc-4078-9d7e-6f96bbd661e9/public_url"
          />
          <CertificationCard
            icon={<GoogleMark />}
            name="Prompting Essentials"
            issuer="Google"
            url="https://coursera.org/share/604a85174e38112cad0980ad4f2ba6c5"
          />
        </div>

        <SectionHeading number="03" title="Technical Skills" />
        <div className="text-sm text-gray-400 space-y-2 mb-8">
          <p>
            <span className="text-[var(--color-text)] font-medium">Languages:</span> English
          </p>
          <p>
            <span className="text-[var(--color-text)] font-medium">Technical Skills:</span> Google Workspace,
            Microsoft Office 365, Data Analysis, Basic Programming (Python), Strong Writing, Research Skills, Document
            Review
          </p>
        </div>
      </div>

      <Footer />
    </>
  )
}
