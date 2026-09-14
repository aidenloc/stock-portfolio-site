// Metadata for the /projects entries. Only the summary fields live here — the
// long-form write-up stays in the page — so the home page's preview card can
// reference a project without duplicating its title and teaser.

export type Project = {
  number: string
  title: string
  teaser: string
  tags: string[]
  href: string
}

export const PROJECTS: Project[] = [
  {
    number: 'Project 1',
    title: 'Building a Full-Stack Portfolio Tracker',
    teaser:
      'A case study on this site itself: the architecture, where the market data comes from, and what building it taught me.',
    tags: ['Next.js', 'Supabase', 'Vercel', 'TypeScript'],
    href: '/projects',
  },
]
