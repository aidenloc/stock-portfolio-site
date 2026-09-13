import { supabase } from '@/lib/supabaseClient'
import AdminPortfolioForm from './AdminPortfolioForm'
import PaperPortfolioForm from './PaperPortfolioForm'
import LogoutButton from './LogoutButton'
import ThemeEditor from './ThemeEditor'

export default async function AdminDashboard() {
  const { data: portfolio, error } = await supabase
    .from('portfolio')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading portfolio: {error.message}</div>
  }

  const { data: paperPortfolio, error: paperError } = await supabase
    .from('paper_portfolio')
    .select('*')
    .order('entry_date', { ascending: true })

  if (paperError) {
    return <div className="p-8 text-red-500">Error loading paper portfolio: {paperError.message}</div>
  }

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <LogoutButton />
      </div>
      <AdminPortfolioForm portfolio={portfolio ?? []} />
      <PaperPortfolioForm holdings={paperPortfolio ?? []} />
      <ThemeEditor />
    </main>
  )
}