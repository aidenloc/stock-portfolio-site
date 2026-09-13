import PaperPortfolio from './PaperPortfolio'
import DailyBriefing from './DailyBriefing'

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <PaperPortfolio />
        <DailyBriefing />
      </div>
      <div className="mt-12 text-center">
        <a href="/admin/login" className="text-xs text-gray-600 hover:text-gray-400">
          Admin
        </a>
      </div>
    </main>
  )
}
