import type { Metadata } from 'next'

// Covers /admin and /admin/login. The login page is a client component and so
// can't export metadata itself, which is why this lives in a layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
