import { supabase } from '@/lib/supabaseClient'
import AdminPortfolioForm from './AdminPortfolioForm'
import LogoutButton from './LogoutButton'

export default async function AdminDashboard() {
  const { data: portfolio, error } = await supabase
    .from('portfolio')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading portfolio: {error.message}</div>
  }

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <LogoutButton />
      </div>
      <AdminPortfolioForm portfolio={portfolio ?? []} />
    </main>
  )
}