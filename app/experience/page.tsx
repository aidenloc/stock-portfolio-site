import Header from '../Header'
import Footer from '../Footer'

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-8 mt-16 first:mt-0">
      <span className="text-sm text-gray-600">{number}</span>
      <div className="flex-1 h-px bg-[var(--color-text)]/15" />
      <span className="text-xs uppercase tracking-widest text-gray-500">{title}</span>
    </div>
  )
}

function Entry({
  org,
  location,
  role,
  dates,
  bullets,
}: {
  org: string
  location: string
  role: string
  dates: string
  bullets: string[]
}) {
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex justify-between items-baseline gap-4">
        <h3 className="font-semibold">{org}</h3>
        <span className="text-xs text-gray-500 whitespace-nowrap">{location}</span>
      </div>
      <div className="flex justify-between items-baseline gap-4 mb-2">
        <p className="text-sm italic text-gray-400">{role}</p>
        <span className="text-xs text-gray-500 whitespace-nowrap">{dates}</span>
      </div>
      <ul className="list-disc list-outside ml-4 space-y-1.5 text-sm text-gray-400">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  )
}

export default function ExperiencePage() {
  return (
    <main className="max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />

      <div className="max-w-3xl mb-16">
        <h1 className="font-serif text-6xl mb-4">Aiden Loc</h1>
        <div className="flex flex-wrap gap-6 text-sm">
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 uppercase tracking-wide text-gray-400 hover:text-[var(--color-text)] transition-colors"
          >
            <FileIcon />
            Resume
          </a>
          <a
            href="https://linkedin.com/in/aiden-loc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 uppercase tracking-wide text-gray-400 hover:text-[var(--color-text)] transition-colors"
          >
            <LinkedInIcon />
            LinkedIn
          </a>
          <a
            href="mailto:aiden.s.loc@gmail.com"
            className="flex items-center gap-2 uppercase tracking-wide text-gray-400 hover:text-[var(--color-text)] transition-colors"
          >
            <MailIcon />
            Contact
          </a>
        </div>
      </div>

      <div className="max-w-3xl">
        <SectionHeading number="01" title="Education" />
        <Entry
          org="University at Buffalo"
          location="Buffalo, NY"
          role="Bachelor of Science in Business Administration"
          dates="Expected May 2030"
          bullets={[
            'Certifications: Google Prompting Essentials, Google AI Essentials',
            'Awards: First Prize Winner, Chinese American Citizens Alliance Greater New York Essay Competition (2025)',
            'Relevant Courses/Exams: CLEP Analyzing and Interpreting Literature, CLEP Calculus, CLEP Financial Accounting',
          ]}
        />

        <SectionHeading number="02" title="Experience" />
        <Entry
          org="Osmanthus LLC"
          location="Brooklyn, NY"
          role="Real Estate Researcher"
          dates="2024 – Present"
          bullets={[
            "Sourced and evaluated prospective real estate acquisitions, ensuring all target properties strictly met the firm's required rent-to-debt payment ratios",
            'Analyzed regional property value trends and historical data to identify high-growth markets and forecast long-term asset appreciation',
            'Conducted environmental risk assessments by vetting property zoning and geographic data to systematically eliminate flood-zone liabilities from the investment pipeline',
          ]}
        />
        <Entry
          org="Wharton Global Youth Investment Competition"
          location="Manhattan, NY"
          role="Team Lead"
          dates="Sept. 2025 – Apr. 2026"
          bullets={[
            'Led a team of 6 to design and execute a comprehensive investment strategy focused on special situations investing',
            'Allocated and managed a $500,000 simulated portfolio, analyzing market data to optimize asset distribution and manage risk',
            "Authored detailed investment reports outlining the team's financial thesis, valuation models, and long-term strategic outlook",
          ]}
        />

        <SectionHeading number="03" title="Extracurricular Experience" />
        <Entry
          org="CIEE International Studies Tokyo"
          location="Tokyo, Japan"
          role="Robotics"
          dates="July – August 2025"
          bullets={[
            'Engineered an autonomous robotic vehicle capable of line-following and real-time maze navigation',
            "Integrated ultrasonic sensors and color detectors to optimize the robot's environmental awareness and obstacle avoidance",
            'Developed foundational skills in hardware integration and algorithmic problem-solving within an international study environment',
          ]}
        />
        <Entry
          org="EZ Esports High Schools League"
          location="Brooklyn, NY"
          role="Team Captain"
          dates="Oct. 2024 – Apr. 2026"
          bullets={[
            'Led and managed an 8-player competitive roster, coordinating practice schedules, strategic reviews, and team dynamics to foster a collaborative culture',
            'Developed high-pressure communication skills by delivering real-time tactical calls and keeping the team focused during high-stakes, fast-paced tournament environments',
            'Spearheaded a year-over-year performance turnaround, driving the team from a 7th-place finish at the 2025 NYC LAN Tournament to a 2nd-place podium finish at the 2026 tournament',
          ]}
        />

        <SectionHeading number="04" title="Technical Skills" />
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
    </main>
  )
}
