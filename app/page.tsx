import PaperPortfolio from './PaperPortfolio'
import Header from './Header'
import Footer from './Footer'

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto p-[calc(var(--spacing-unit)*2rem)]">
      <Header />
      <PaperPortfolio />
      <Footer />
    </main>
  )
}
