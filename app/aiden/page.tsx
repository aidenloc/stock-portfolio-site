import Header from '../Header'
import Footer from '../Footer'
import Card from '../Card'

export default function AidenPage() {
  return (
    <main className="max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />

      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">About</p>
        <h1 className="text-4xl font-bold mb-2">Aiden Loc</h1>
        <p className="text-gray-400 mb-8 italic">[Add a short bio / tagline here]</p>

        <Card className="mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-4">Experience</p>
          <div className="space-y-4 text-sm text-gray-400 italic">
            <p>[Add work experience here — company, role, dates, description]</p>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-4">Contact</p>
          <div className="space-y-2 text-sm text-gray-400 italic">
            <p>[Add email address]</p>
            <p>[Add LinkedIn / GitHub / other links]</p>
          </div>
        </Card>
      </div>

      <Footer />
    </main>
  )
}
