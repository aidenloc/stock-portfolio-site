'use client'

import { useId, useState } from 'react'
import Card from '../Card'
import { CardCta } from '../CardCta'
import type { Project } from '@/lib/projects'

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs uppercase tracking-widest text-[var(--color-text)]/45 border border-[var(--color-primary)]/20 rounded-[var(--border-radius)] px-2.5 py-1">
      {children}
    </span>
  )
}

export default function ProjectCard({ project, children }: { project: Project; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()

  // Collapsed, the card is one cell of a two-up grid and takes its height from
  // the grid row, so both cards match exactly whatever their tags and titles
  // do -- no fixed height to keep in sync with the content. Expanding spans
  // the full row instead of growing one cell, which would otherwise stretch
  // the still-collapsed neighbour into a tall, mostly-empty box.
  return (
    <Card className={`flex flex-col ${expanded ? 'md:col-span-2' : ''}`}>
      {/* Title/tags come from lib/projects so the home page's preview card
          can reference a project without restating it. */}
      <p className="text-xs text-[var(--color-primary)]/70 font-serif mb-2">{project.number}</p>
      <h2 className="font-serif font-semibold text-2xl mb-3">{project.title}</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {project.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <p className="text-sm text-[var(--color-text)]/60 leading-relaxed">{project.teaser}</p>

      {/* Rendered even while collapsed and hidden with the `hidden` attribute
          rather than stripped from the tree, so the write-up still ships in
          the server-rendered HTML for crawlers and so aria-controls always
          points at a real element. */}
      {/* max-w-2xl caps the line length once the card spans the full grid
          row -- prose set across the whole 1024px container reads badly. */}
      <div
        id={panelId}
        hidden={!expanded}
        className="space-y-6 text-sm text-[var(--color-text)]/60 leading-relaxed mt-6 max-w-2xl"
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="group inline-flex self-start mt-auto pt-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <CardCta label={expanded ? 'Show less' : 'Read the write-up'} />
      </button>
    </Card>
  )
}
