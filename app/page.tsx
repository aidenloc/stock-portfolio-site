import PaperPortfolio from './PaperPortfolio'

export default function Home() {
  return (
    <main className="p-[calc(var(--spacing-unit)*2rem)]">
      <PaperPortfolio />
      <div className="mt-12 text-center">
        <a href="/admin/login" className="text-xs text-gray-600 hover:text-gray-400">
          Admin
        </a>
      </div>
    </main>
  )
}
