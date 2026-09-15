import { ArrowIcon } from './icons'

// The small "VIEW PORTFOLIO →" / "READ MORE →" link at the foot of a card.
// The interactive cue on hover is the underline drawing in and the arrow
// nudging right, not a plain color swap -- shared by every card link so the
// hover choreography can't drift between them. Requires a `group` class on
// the containing <Link>.
export function CardCta({ label }: { label: string }) {
  return (
    <span className="mt-auto inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--color-text)]/60 transition-colors duration-300 group-hover:text-[var(--color-primary)]">
      <span className="relative">
        {label}
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[var(--color-primary)] transition-transform duration-300 group-hover:scale-x-100"
        />
      </span>
      <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  )
}
