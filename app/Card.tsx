// Hairline accent border + soft shadow instead of a flat filled box, matching
// the treatment on the home page's preview cards -- floating rather than
// painted on. Padding bumped from 1.75rem to 2rem for the same reason.
export default function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`bg-[var(--color-card)] rounded-[var(--border-radius)] p-[calc(var(--spacing-unit)*2rem)]
                  border border-[var(--color-primary)]/15
                  shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_32px_-16px_rgba(0,0,0,0.45)] ${className}`}
    >
      {children}
    </div>
  )
}
