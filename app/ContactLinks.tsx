import { CONTACT } from '@/lib/siteContent'
import { FileIcon, LinkedInIcon, MailIcon } from './icons'

// The Resume / LinkedIn / Contact row, shared by the home hero and the
// /experience header so the two can't drift apart.
export default function ContactLinks({ className = '' }: { className?: string }) {
  const linkClass =
    'flex items-center gap-2 uppercase tracking-wide text-gray-400 hover:text-[var(--color-text)] transition-colors'

  return (
    <div className={`flex flex-wrap gap-6 text-sm ${className}`}>
      <a href={CONTACT.resume} target="_blank" rel="noopener noreferrer" className={linkClass}>
        <FileIcon />
        Resume
      </a>
      <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" className={linkClass}>
        <LinkedInIcon />
        LinkedIn
      </a>
      <a href={`mailto:${CONTACT.email}`} className={linkClass}>
        <MailIcon />
        Contact
      </a>
    </div>
  )
}
