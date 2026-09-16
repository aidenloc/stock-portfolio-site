import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '../Footer'
import Card from '../Card'
import { CardCta } from '../CardCta'
import { PROJECTS } from '@/lib/projects'

const DESCRIPTION =
  'Engineering and research write-ups — including a full case study on building this portfolio tracker with Next.js, Supabase, and Vercel.'

export const metadata: Metadata = {
  title: 'Projects',
  description: DESCRIPTION,
  alternates: { canonical: '/projects' },
  // `images` repeated deliberately -- see the note in app/experience/page.tsx.
  openGraph: {
    title: 'Projects | Aiden Loc',
    description: DESCRIPTION,
    url: '/projects',
    images: ['/opengraph-image'],
  },
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs uppercase tracking-widest text-[var(--color-text)]/45 border border-[var(--color-primary)]/20 rounded-[var(--border-radius)] px-2.5 py-1">
      {children}
    </span>
  )
}

export default function ProjectsPage() {
  return (
    <>
      <div className="max-w-2xl mx-auto mt-10">
        <p className="text-xs uppercase tracking-wide text-[var(--color-text)]/45 mb-2">Projects</p>
        <h1 className="font-serif font-semibold tracking-tight text-4xl sm:text-5xl mb-10">Research &amp; Modeling</h1>

        <Card>
          {/* Title/tags come from lib/projects so the home page's preview card
              can reference this project without restating it. */}
          <p className="text-xs text-[var(--color-primary)]/70 font-serif mb-2">{PROJECTS[0].number}</p>
          <h2 className="font-serif font-semibold text-2xl mb-3">{PROJECTS[0].title}</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {PROJECTS[0].tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>

          <div className="space-y-6 text-sm text-[var(--color-text)]/60 leading-relaxed">
            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Why I built this</h3>
              <p>
                I wanted a way to practice equity research and portfolio management the way a real analyst
                would — sizing positions, tracking a thesis against a benchmark, and revisiting calls as new
                information comes in — without needing real capital on the line. Building the tracker myself,
                rather than using an existing brokerage's paper-trading tool, meant I could also treat it as a
                second project: a hands-on way to learn full-stack engineering, from database design through
                to shipping and operating a live product.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Architecture</h3>
              <p className="mb-3">
                The site is a Next.js (App Router) application written in TypeScript and deployed on Vercel.
                Data lives in Supabase (Postgres), accessed two different ways depending on who's asking:
                public pages read through an anon key restricted by row-level security to SELECT-only access,
                while writes (adding a position, editing the theme) go through a service-role client that's
                only reachable from server-side API routes gated behind a signed session cookie. That split
                means the public site can never write to the database, regardless of what a visitor's browser
                sends.
              </p>
              <p>
                A small theme system sits on top of this: colors, spacing, font, and border radius are stored
                as a single settings row and rendered as CSS custom properties on every page load, so the
                entire site's look can be adjusted from the admin panel without a code change or redeploy.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Where the data comes from</h3>
              <p className="mb-3">
                Historical price series (the performance chart, individual ticker charts) come from Yahoo
                Finance's public chart endpoint — the only source I found with free historical data at this
                granularity. Live quotes, sector classification, company news, and the earnings calendar come
                from Finnhub's free tier. The performance chart itself indexes the portfolio and the S&amp;P
                500 to 0% at the start of whichever window is selected (1D through 1Y), rather than showing a
                raw since-inception curve zoomed in — the same convention fund fact sheets use, so the chart
                actually answers "how did this period go" instead of just "what's the number today."
              </p>
              <p>
                Sector data is fetched once per holding and cached in the database rather than looked up on
                every page load, and the daily briefing is generated by a single Vercel Cron job once a day
                rather than on every visit — both deliberate choices to stay well inside a free API tier's
                rate limits as the number of visitors and holdings grows.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">What this taught me</h3>
              <p>
                Most of the real engineering here wasn't the charting or the styling — it was the boring
                parts that matter in production: making sure admin edits actually invalidate the right cached
                data, checking that a database write actually succeeded instead of assuming it did, and
                thinking about what a public, unauthenticated visitor's browser is and isn't allowed to do to
                the database. Those are the same habits — verify the data, don't trust a green checkmark, know
                exactly who can touch what — that show up in equity research too.
              </p>
            </div>
          </div>

          <a
            href="https://github.com/aidenloc/stock-portfolio-site"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex mt-6"
          >
            <CardCta label="View Source on GitHub" />
          </a>
        </Card>

        {/* mt-8 lives on this card rather than mb-8 on the one above, so the
            first entry's markup stays untouched. */}
        <Card className="mt-8">
          <p className="text-xs text-[var(--color-primary)]/70 font-serif mb-2">{PROJECTS[1].number}</p>
          <h2 className="font-serif font-semibold text-2xl mb-3">{PROJECTS[1].title}</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {PROJECTS[1].tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>

          <div className="space-y-6 text-sm text-[var(--color-text)]/60 leading-relaxed">
            <p className="text-xs uppercase tracking-widest text-[var(--color-text)]/45">Part One — How It Works</p>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Where the data comes from</h3>
              <p className="mb-3">
                Two sources, picked for different jobs. Macro data comes from FRED, the Federal Reserve Bank of
                St. Louis&apos;s public data API — seven series in all: real GDP (quarterly), CPI, the
                unemployment rate and the effective federal funds rate (monthly), and constant-maturity Treasury
                yields at the 3-month, 2-year and 10-year tenors (daily), going back to 2005.
              </p>
              <p>
                Market data comes from Yahoo Finance through the yahoo-finance2 client: daily open/high/low/close
                and volume for the eleven S&amp;P 500 sector ETFs, plus four cross-asset proxies — long-dated
                Treasuries (TLT), gold (GLD), oil (USO) and the dollar (UUP) — going back to 2015.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">How the data reaches the app</h3>
              <p className="mb-3">
                Each source sits behind its own API route. One takes a FRED series ID and a start date and returns
                the raw observation list; the other takes a ticker and returns daily bars. Both fail soft — an
                upstream non-200, or a thrown client error, is caught and returned as a 502 with a readable
                message instead of crashing the route. That matters most for Yahoo, which is an unofficial
                endpoint that can rate-limit, change shape, or go dark on a delisted ticker without notice.
              </p>
              <p>
                FRED has a quirk worth handling explicitly too: it represents a missing observation as the string
                &quot;.&quot; rather than omitting the row, so those are filtered out before anything gets coerced
                to a number — otherwise a single unreleased month silently becomes a zero in the middle of a chart.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Supabase as a cache layer</h3>
              <p className="mb-3">
                Nothing on the page talks to FRED or Yahoo directly. Both sources are mirrored into Postgres
                (Supabase) — one table keyed on (series, date), another on (symbol, date), roughly 17,000 macro
                observations and 43,000 daily price rows between them.
              </p>
              <p className="mb-3">
                Those unique constraints are what make the pipeline safe to re-run. The refresh job re-pulls the
                entire history every night and upserts on conflict, which makes a run idempotent: repeating it
                never duplicates a row, and any gap left by a missed or failed run is backfilled automatically on
                the next pass. Without the constraint, each nightly run would simply append another 60,000 rows.
              </p>
              <p>
                Both tables are readable by the public anon key under row-level security, and writable only
                through a service-role client that never leaves the server.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">The scheduled refresh</h3>
              <p>
                A Vercel Cron job hits the refresh route once a day. It&apos;s gated behind a bearer token, so it
                can&apos;t be triggered by anyone who guesses the URL. Internally it runs all twenty-two series
                and symbols through settled promises rather than a plain loop, so one rate-limited symbol
                can&apos;t abort the other twenty-one, and it returns a per-source list of whatever failed — a
                partial failure shows up in the response instead of passing silently as a success.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">How it&apos;s rendered</h3>
              <p className="mb-3">
                The page reads only from the cache, through a single read route. Two of the three visuals are
                recharts line charts: the yield curve, and inflation against the fed funds rate — where CPI is
                converted from an index level into a year-over-year percentage change so it&apos;s directly
                comparable to an interest rate, rather than bolted onto a second axis. The third, the sector
                rotation heatmap, is a plain CSS grid with no charting library: trailing returns over four
                windows, shaded on a diverging green/red scale whose intensity tracks magnitude and caps at ±15%
                so one outlier can&apos;t wash out the rest of the grid.
              </p>
              <p>
                The range buttons (1Y / 5Y / 10Y / Max) filter both time-series charts together, and since the
                full history is already loaded, switching ranges filters in memory instead of refetching. The
                heatmap carries its own asset-class filter and sorts leader-to-laggard by year-to-date return.
                Both charts share one computed domain and tick set, so they stack on a genuinely common time axis.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Stack and trade-offs</h3>
              <p className="mb-3">
                Next.js (App Router) and TypeScript, Postgres via Supabase, deployed on Vercel with Vercel Cron,
                recharts for the line charts, and yahoo-finance2 and the FRED REST API upstream.
              </p>
              <p>
                The central decision is caching rather than fetching live: page loads never depend on a
                third-party API being up or inside its rate limit, and the cost is data that can be up to a day
                stale — the right trade for macro series that publish monthly or quarterly anyway. Three smaller
                ones follow from scale: Supabase caps a single query at 1,000 rows, so the read route counts first
                and then fetches every page in parallel instead of walking them one at a time; the response is
                cached for an hour, since the tables underneath only change once a day; and each series is
                downsampled to around 800 points before rendering, because a decade of daily yields is thousands
                of points competing for a few hundred pixels.
              </p>
            </div>

            <p className="text-xs uppercase tracking-widest text-[var(--color-text)]/45 pt-2">
              Part Two — What It Means
            </p>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">The yield curve</h3>
              <p className="mb-3">
                A Treasury yield is what the US government pays to borrow money for a given length of time. The
                chart shows three: 3 months, 2 years, and 10 years. Normally the longer you lend, the more
                you&apos;re paid, so the 10-year sits above the 2-year and the 3-month.
              </p>
              <p>
                When that ordering flips — short-term yields above long-term — the curve is &quot;inverted,&quot;
                and it means markets expect rates to be lower in the future, which usually means they expect the
                economy to weaken enough that the Fed will cut. An inversion has preceded every US recession of
                the past half-century, which is why it gets watched so closely. It&apos;s a signal with a long and
                inconsistent lead time, though, not a countdown clock: the gap between inversion and downturn has
                run anywhere from several months to two years.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Inflation vs. the fed funds rate</h3>
              <p className="mb-3">
                CPI measures the price of a broad basket of consumer goods and services; shown as a year-over-year
                change, it&apos;s the inflation rate people actually experience. The federal funds rate is the
                overnight interest rate the Fed targets — its primary lever on the economy.
              </p>
              <p>
                Putting the two on one axis shows the Fed&apos;s reaction function directly: inflation runs hot
                and the Fed raises rates to cool borrowing and demand; inflation falls or unemployment climbs and
                it cuts. The relationship between the lines is its own signal. When inflation sits above the funds
                rate, the real (inflation-adjusted) interest rate is negative and policy is effectively
                stimulative; when the funds rate is well above inflation, policy is restrictive and deliberately
                slowing things down.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Sector rotation</h3>
              <p className="mb-3">
                Each of the eleven ETFs holds the S&amp;P 500 companies in a single sector — technology,
                financials, energy, health care, and so on — so its return is a clean read on how that slice of
                the economy is doing. Comparing them across several trailing windows shows where money is moving.
              </p>
              <p className="mb-3">
                The classic pattern: cyclical sectors (technology, consumer discretionary, industrials, materials)
                lead when investors expect growth, while defensive ones (consumer staples, utilities, health care)
                lead when they expect a slowdown — people keep buying toothpaste and electricity in a recession,
                but they postpone the new car. Energy tracks commodity prices, and financials are unusually
                sensitive to the shape of the yield curve, since banks fund themselves short-term and lend
                long-term.
              </p>
              <p>
                The four non-equity rows add cross-asset context — money moving into Treasuries and gold and out
                of oil says something different than the reverse. Several windows matter because one month is
                mostly noise; a sector leading across 1-month, 3-month, 6-month and year-to-date is a trend.
              </p>
            </div>

            <div>
              <h3 className="text-[var(--color-text)] font-semibold mb-2">Recession shading</h3>
              <p>
                The shaded bands are the recessions dated by the National Bureau of Economic Research, the body
                treated as the semi-official arbiter of when US recessions begin and end. The NBER dates them from
                a broad set of indicators and usually announces them well after the fact — sometimes more than a
                year later — which is precisely why forward-looking signals like the yield curve draw so much
                attention. Overlaying the bands puts every series in historical context: rather than an abstract
                line, you can see the curve inverting before a shaded band, the Fed cutting into and through one,
                and defensives holding up across it. Over the window this dashboard covers, those bands are the
                2007–2009 financial crisis and the short, sharp COVID recession of early 2020.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-6">
            <Link href={PROJECTS[1].href} className="group inline-flex">
              <CardCta label="View the Live Dashboard" />
            </Link>
            <a
              href="https://github.com/aidenloc/stock-portfolio-site"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex"
            >
              <CardCta label="View Source on GitHub" />
            </a>
          </div>
        </Card>
      </div>

      <Footer />
    </>
  )
}
