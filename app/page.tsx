import { supabase } from '@/lib/supabaseClient'

export default async function Home() {
  const { data: portfolio, error } = await supabase
    .from('portfolio')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading portfolio: {error.message}</div>
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">My Portfolio</h1>
      <ul className="space-y-2">
        {portfolio?.map((item) => (
          <li key={item.id} className="text-lg border rounded px-4 py-2">
            {item.ticker}
          </li>
        ))}
      </ul>
    </main>
  )
}