import { supabase } from '@/lib/supabaseClient'
import PaperPortfolioForm from './PaperPortfolioForm'
import LogoutButton from './LogoutButton'
import ThemeEditor from './ThemeEditor'
import Card from '../Card'

// Without this, Next prerenders this page once at build time (no
// Request-time API is used here) and serves that same static snapshot
// forever — router.refresh() after an add/delete just re-fetches the
// identical cached payload instead of hitting Supabase again.
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const { data: paperPortfolio, error: paperError } = await supabase
    .from('paper_portfolio')
    .select('*')
    .order('entry_date', { ascending: true })

  if (paperError) {
    return <div className="p-8 text-red-500">Error loading paper portfolio: {paperError.message}</div>
  }

  return (
    <main className="max-w-[1000px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-6 text-sm">
          <a href="/" className="text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to site
          </a>
          <LogoutButton />
        </div>
      </div>
      <div className="space-y-8">
        <Card>
          <PaperPortfolioForm holdings={paperPortfolio ?? []} />
        </Card>
        <Card>
          <ThemeEditor />
        </Card>
      </div>
    </main>
  )
}