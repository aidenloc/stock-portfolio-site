// Editable copy for the home page. Everything here is plain data so it can be
// changed without touching layout code.
//
// TODO(aiden): the three PLACEHOLDER strings below are mine to guess at, so I
// left them deliberately obvious rather than inventing claims about you.
// Replace them with your own words.

export const POSITIONING = 'Business student building at the intersection of finance and software'

export const THESIS =
  '[PLACEHOLDER — replace with your own words.] Two or three sentences on why this site exists: how you think ' +
  'about markets, what you are trying to learn by running a portfolio in public, and why you build the tools ' +
  'yourself rather than using something off the shelf.'

export const NOW = '[PLACEHOLDER] What you are focused on right now — one sentence.'

// TODO(aiden): seeded ONLY from the "Technical Skills" line already on your
// resume (/experience). Nothing here is inferred about your level, and the
// tooling used to build this site is deliberately not listed as your skill.
// Add, remove, and regroup freely — the strip renders whatever is in this array.
export const SKILL_GROUPS: { category: string; items: string[] }[] = [
  {
    category: 'Languages & Frameworks',
    items: ['Python'],
  },
  {
    category: 'Finance & Modeling',
    items: ['Data Analysis', 'Microsoft Office 365', 'Google Workspace', 'Research', 'Document Review'],
  },
]

export const CONTACT = {
  email: 'aiden.s.loc@gmail.com',
  linkedin: 'https://linkedin.com/in/aiden-loc',
  resume: '/resume.pdf',
}
