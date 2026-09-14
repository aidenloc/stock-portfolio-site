// Single source of truth for the /experience entries. Extracted from the page so
// the home page's "current role" card reads the same data instead of repeating
// it, and so the entries can be ordered chronologically in one place.
//
// `dates` is the display string exactly as it should read. `start`/`end` exist
// only for sorting; `end: null` means ongoing.

export type ExperienceKind = 'education' | 'experience' | 'extracurricular'

export type ExperienceEntry = {
  org: string
  location: string
  role: string
  dates: string
  kind: ExperienceKind
  start: string
  end: string | null
  bullets: string[]
}

export const EXPERIENCE_ENTRIES: ExperienceEntry[] = [
  {
    org: 'University at Buffalo',
    location: 'Buffalo, NY',
    role: 'Bachelor of Science in Business Administration',
    dates: 'Expected May 2030',
    kind: 'education',
    start: '2026-08',
    end: null,
    bullets: [
      'Awards: First Prize Winner, Chinese American Citizens Alliance Greater New York Essay Competition (2025)',
      'Relevant Courses/Exams: CLEP Analyzing and Interpreting Literature, CLEP Calculus, CLEP Financial Accounting',
    ],
  },
  {
    org: 'Osmanthus LLC',
    location: 'Brooklyn, NY',
    role: 'Real Estate Researcher',
    dates: '2024 – Present',
    kind: 'experience',
    start: '2024-01',
    end: null,
    bullets: [
      "Sourced and evaluated prospective real estate acquisitions, ensuring all target properties strictly met the firm's required rent-to-debt payment ratios",
      'Analyzed regional property value trends and historical data to identify high-growth markets and forecast long-term asset appreciation',
      'Conducted environmental risk assessments by vetting property zoning and geographic data to systematically eliminate flood-zone liabilities from the investment pipeline',
    ],
  },
  {
    org: 'Wharton Global Youth Investment Competition',
    location: 'Manhattan, NY',
    role: 'Team Lead',
    dates: 'Sept. 2025 – Apr. 2026',
    kind: 'experience',
    start: '2025-09',
    end: '2026-04',
    bullets: [
      'Led a team of 6 to design and execute a comprehensive investment strategy focused on special situations investing',
      'Allocated and managed a $500,000 simulated portfolio, analyzing market data to optimize asset distribution and manage risk',
      "Authored detailed investment reports outlining the team's financial thesis, valuation models, and long-term strategic outlook",
    ],
  },
  {
    org: 'EZ Esports High Schools League',
    location: 'Brooklyn, NY',
    role: 'Team Captain',
    dates: 'Oct. 2024 – Apr. 2026',
    kind: 'extracurricular',
    start: '2024-10',
    end: '2026-04',
    bullets: [
      'Led and managed an 8-player competitive roster, coordinating practice schedules, strategic reviews, and team dynamics to foster a collaborative culture',
      'Developed high-pressure communication skills by delivering real-time tactical calls and keeping the team focused during high-stakes, fast-paced tournament environments',
      'Spearheaded a year-over-year performance turnaround, driving the team from a 7th-place finish at the 2025 NYC LAN Tournament to a 2nd-place podium finish at the 2026 tournament',
    ],
  },
  {
    org: 'CIEE International Studies Tokyo',
    location: 'Tokyo, Japan',
    role: 'Robotics',
    dates: 'July – August 2025',
    kind: 'extracurricular',
    start: '2025-07',
    end: '2025-08',
    bullets: [
      'Engineered an autonomous robotic vehicle capable of line-following and real-time maze navigation',
      "Integrated ultrasonic sensors and color detectors to optimize the robot's environmental awareness and obstacle avoidance",
      'Developed foundational skills in hardware integration and algorithmic problem-solving within an international study environment',
    ],
  },
]

// Most recent first: anything ongoing outranks anything finished, then by end
// date, then by start date.
export function byMostRecent(a: ExperienceEntry, b: ExperienceEntry): number {
  if ((a.end === null) !== (b.end === null)) return a.end === null ? -1 : 1
  if (a.end && b.end && a.end !== b.end) return b.end.localeCompare(a.end)
  return b.start.localeCompare(a.start)
}

export const entriesByKind = (kind: ExperienceKind) =>
  EXPERIENCE_ENTRIES.filter((e) => e.kind === kind).sort(byMostRecent)

// Education, work and extracurriculars interleaved into a single chronological
// thread for the /experience timeline.
export const allEntriesByMostRecent = () => [...EXPERIENCE_ENTRIES].sort(byMostRecent)

// Merging the three sections would otherwise lose the distinction between them,
// so each entry carries its own small label instead.
export const KIND_LABEL: Record<ExperienceKind, string> = {
  education: 'Education',
  experience: 'Experience',
  extracurricular: 'Extracurricular',
}

// The role the home page advertises: the most recent thing that is actual work.
export const CURRENT_ROLE = entriesByKind('experience')[0]
