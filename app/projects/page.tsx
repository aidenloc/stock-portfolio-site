import Header from '../Header'
import Footer from '../Footer'
import Card from '../Card'

export default function ProjectsPage() {
  return (
    <main className="max-w-[1600px] mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />

      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Projects</p>
        <h1 className="text-4xl font-bold mb-8">Research &amp; Modeling</h1>

        <Card>
          <p className="text-sm text-gray-400">
            Equity research write-ups and DCF models will be posted here. Nothing published yet — check back soon.
          </p>
        </Card>
      </div>

      <Footer />
    </main>
  )
}
