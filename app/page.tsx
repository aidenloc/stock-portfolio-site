import { supabase } from '@/lib/supabaseClient'
import PriceList from './PriceList'
import PaperPortfolio from './PaperPortfolio'

// Same reason as app/admin/page.tsx: this page has no Request-time API, so
// Next would otherwise prerender it once at build time and freeze the
// ticker list until the next deploy, even though admin edits the table live.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: portfolio, error } = await supabase
    .from('portfolio')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading portfolio: {error.message}</div>
  }

  return (
    <main className="p-[calc(var(--spacing-unit)*2rem)]">
      <PaperPortfolio />
      <h1 className="text-2xl font-bold mb-[calc(var(--spacing-unit)*1rem)]">My Portfolio</h1>
      <PriceList portfolio={portfolio ?? []} />
      <div className="mt-12 text-center">
        <a href="/admin/login" className="text-xs text-gray-600 hover:text-gray-400">
          Admin
        </a>
      </div>
    </main>
  )
}