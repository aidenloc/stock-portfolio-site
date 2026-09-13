# Stock Portfolio Site — Comprehensive Project Report

**Live URL:** https://stock-portfolio-site.vercel.app/
**GitHub:** aidenloc/stock-portfolio-site
**Local dev:** `npm run dev` → http://localhost:3000

---

## 1. Original Objectives

Build a personal website with two main sections:

1. **Main page** — displays stocks in a personal portfolio, customizable list, a daily briefing section (not yet built), and an earnings-call date tracker (not yet built).
2. **Separate tab** — displays personal projects (research papers, modeling work) — not yet built.

**Constraints set at project start:** relatively simple on the coding side, free to build and run, publicly accessible to anyone (no login required to view).

## 2. New Objectives (this phase)

1. **Redesign the look and feel to be inspired by Finary** (a wealth-tracking app). Research notes on Finary below (Section 8) — no Finary code, assets, or branding should be copied; this is stylistic/UX inspiration only (clean modern net-worth-style dashboard, strong data visualization, card-based layout, performance-focused). **Built for the public homepage — see Section 4.9.** Scoped to the homepage only, by request; `/admin` keeps its plain functional look.
2. **Build an editable "paper portfolio" performance tracker** — a simulated/hypothetical portfolio (not the same as the existing watchlist-style `portfolio` table) where the user can log positions (ticker, shares, entry price, entry date), and see overall performance over time, similar in spirit to how ARK Invest's fund pages (e.g. ark-funds.com/funds/arkk) show a fund's growth chart and holdings. This should be manageable from the `/admin` dashboard. **Built — see Section 4.9.**

---

## 3. Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, TypeScript)
- **Styling:** Tailwind CSS + a custom CSS-variable-based theme system (see Section 6)
- **Database:** Supabase (Postgres), accessed via `@supabase/supabase-js`
- **Hosting:** Vercel (Hobby/free tier)
- **Live stock quotes:** Finnhub API (free tier — 60 calls/minute rolling limit, NO historical candle data on free tier)
- **Historical price data:** Yahoo Finance's public/unofficial chart endpoint (`query1.finance.yahoo.com/v8/finance/chart/`) — no API key required, used because Finnhub free tier doesn't include historical data for US equities
- **Charting:** Recharts
- **Version control:** Git + GitHub
- **Deployment tooling:** Vercel CLI (`vercel --prod`) used as a reliable fallback to GitHub's auto-deploy webhook, which has been flaky in this project (see Section 7)

---

## 4. Features Built So Far

### 4.1 Public homepage (`app/page.tsx`)
- Plain sync component — no server-side data fetching happens here anymore (see 4.2). Renders `PaperPortfolio` (Section 4.9), which does its own client-side fetching.
- Has a small, deliberately understated "Admin" text link at the bottom linking to `/admin/login` (not a prominent button — this is for the site owner, not visitors).

### 4.2 Removed: the original live watchlist ("My Portfolio" / `app/PriceList.tsx`)
- The original design (live-quote watchlist with 15s auto-refresh while the market is open, `isMarketOpen()` NYSE-hours check, green/red gain coloring) has been **removed from the homepage and deleted** (`app/PriceList.tsx` no longer exists) — the paper portfolio tracker (Section 4.9) is now the homepage's only holdings display, per this phase's redesign.
- The underlying `portfolio` Supabase table, `AdminPortfolioForm.tsx`, and `app/api/portfolio/route.ts` were **left in place** in `/admin` (not asked to be removed) — the owner can still manage that table, it's just no longer rendered publicly. If it's confirmed fully unused going forward, it'd be reasonable to remove those too.
- `StockChart.tsx` (Section 4.3) — the modal chart component this watchlist used — is **still used**, now opened by clicking a ticker row in the paper portfolio's holdings table instead (Section 4.9).

### 4.3 Interactive stock charts (`app/StockChart.tsx`)
- Modal overlay. Range buttons: 1D, 5D, 1M, 6M, YTD, 1Y.
- Fetches `/api/history?ticker=X&period=Y` on mount and whenever the period changes.
- Line chart via Recharts, green if the period's net change is positive, red if negative.
- X-axis labels format differently for intraday (1D/5D → time-of-day) vs. longer ranges (date).

### 4.4 Historical data API (`app/api/history/route.ts`)
- No API key needed. Delegates to the shared `lib/yahooHistory.ts` helper (see 4.9), which maps period → Yahoo Finance `range`/`interval` params:
  - 1D → range=1d, interval=5m
  - 5D → range=5d, interval=15m
  - 1M → range=1mo, interval=1d
  - 6M → range=6mo, interval=1d
  - YTD → range=ytd, interval=1d
  - 1Y → range=1y, interval=1d
  - 5Y → range=5y, interval=1wk (added for the paper portfolio feature, also usable here)
- Sends a browser-like `User-Agent` header (Yahoo's endpoint can be finicky without one).
- Returns `{ points: [{ time, price }] }`, filtering out null closes.

### 4.5 Live quote API (`app/api/quote/route.ts`)
- Uses `FINNHUB_API_KEY` server-side. Returns `{ price, change, percentChange }` from Finnhub's `/quote` endpoint.

### 4.6 Admin authentication system
- **Not** full user-account auth — a single shared password (`ADMIN_PASSWORD` env var) plus a session cookie, sufficient for a single-owner personal site.
- `lib/session.ts`: `createSessionToken()` and `isValidSessionToken()`. **Important implementation detail:** this deliberately does NOT use Node's `crypto` module (no HMAC/hashing) — it directly compares against `SESSION_SECRET`. This is because `middleware.ts` runs in Next.js's Edge Runtime, which does not support Node's `crypto` module; an earlier attempt using `crypto.createHmac` broke the middleware silently.
- `app/api/admin/login/route.ts`: checks submitted password against `ADMIN_PASSWORD`; if correct, sets an httpOnly cookie named `admin_session` (24hr maxAge, sameSite lax, secure in production).
- `app/api/admin/logout/route.ts`: clears the cookie.
- `middleware.ts`: intercepts all requests to `/admin/*` (except `/admin/login` itself) via `matcher: ['/admin/:path*']`; redirects to `/admin/login` if the cookie is missing/invalid.
- `app/admin/login/page.tsx`: simple password form, calls the login route, redirects to `/admin` on success.

### 4.7 Admin dashboard (`app/admin/page.tsx`)
- Protected by middleware. Composes four sections:
  - `AdminPortfolioForm.tsx` — add/remove tickers from the `portfolio` table (no password re-entry needed; relies on the session cookie).
  - `PaperPortfolioForm.tsx` — add/remove positions in the `paper_portfolio` table (Section 4.9).
  - `ThemeEditor.tsx` — see Section 4.8.
  - `LogoutButton.tsx` — clears session, redirects to login.
- `app/api/portfolio/route.ts` — POST (add) and DELETE (remove) handlers. Both check the session cookie server-side (via `next/headers` `cookies()`) before using `supabaseAdmin` (service_role client) to write. Public visitors cannot write to this table under any circumstances — the anon key used by the public site only has SELECT access via RLS.

### 4.8 Full theme system
- **`site_settings` Supabase table** (single row, `id=1`): `primary_color`, `background_color`, `text_color`, `card_background_color` (added for the Finary-style card layout, Section 4.9 — nullable), `card_opacity` (added for the ambient-gradient look below — nullable, 0-100), `font_family`, `spacing_scale` (compact/normal/spacious), `border_radius`.
- **`app/api/settings/route.ts`**: GET is public (anyone loading the site needs to read the current theme); PUT is admin-only (session-cookie-gated, uses `supabaseAdmin`). The PUT handler just spreads whatever fields it's given into an `update()` call, so adding new fields has never required route changes.
- **`app/layout.tsx`**: server component, fetches settings on every request, computes a `themeStyle` object of CSS custom properties (`--color-bg`, `--color-text`, `--color-primary`, `--color-card`, `--font-family`, `--border-radius`, `--spacing-unit` — the last one is a numeric multiplier: compact=0.75, normal=1, spacious=1.5), and applies them via the `style` prop on the `<html>` tag. **`--color-card`** is the one exception to "just use the DB value or a hardcoded fallback": if `card_background_color` is unset, it falls back to the CSS expression `color-mix(in srgb, var(--color-bg) 100%, white 8%)` — a lifted shade computed *from whatever background is picked*, rather than a hardcoded hex that could look wrong against a custom background. That base color (picked or derived) is then composed through a second `color-mix(..., transparent)` at `card_opacity`% (default 85 when unset), so **the same variable already carries both the color and the admin-adjustable transparency** — no component needs to know about opacity separately, `bg-[var(--color-card)]` just works.
- **Ambient background gradient** (this phase's Finary-coloring-effects request): `<body>`'s `background` is two stacked `radial-gradient()`s (soft corner glows) tinted with `color-mix(in srgb, var(--color-primary) X%, transparent)`, layered over the flat `--color-bg`, `background-attachment: fixed` so it doesn't scroll with content. Because the glow's hue is literally `var(--color-primary)`, it automatically follows whatever primary color is picked in `/admin` — no separate "gradient color" setting needed. Stylistic inspiration only (glow position/spread was hand-tuned to the look in reference screenshots, not copied assets).
- **Components updated to use theme variables:** buttons (`bg-[var(--color-primary)]`), borders/backgrounds in `StockChart` and `PaperPortfolio` (`rounded-[var(--border-radius)]`, spacing via `calc(var(--spacing-unit)*Xrem)` in Tailwind arbitrary values, card surfaces via `bg-[var(--color-card)]`).
- **Intentionally NOT themed** (kept as fixed colors for functional/legibility reasons): green/red gain-loss indicators (including the new pill-style `GainBadge`, Section 4.9), the red "Remove" delete button, and form input fields (kept white background / black text regardless of theme, for contrast reliability).
- **`ThemeEditor.tsx`** (in `/admin`): color pickers (`<input type="color">`) for primary/background/text/card background, a **card-transparency range slider** (20-100%, labeled with the live percentage), a `<select>` for border radius (0/4/8/16px presets), a `<select>` for a curated font list (sans-serif, serif, monospace, Georgia, Helvetica), and a `<select>` for spacing scale. Saves via PUT to `/api/settings`, then calls `router.refresh()`.
- **Setup:** `supabase/site_settings_add_card_color.sql` and `supabase/site_settings_add_card_opacity.sql` both need to be run in the Supabase SQL editor before their pickers can save (confirmed directly, neither column exists in production as of this writing — see Section 5). Until then, both pickers still render and the page still works correctly (falling back to the `color-mix` default and 85% respectively), they just can't persist a custom value yet.
- **`app/layout.tsx` now has its own `export const dynamic = 'force-dynamic'`** — see the Section 7 lesson on why this matters specifically for settings-driven rendering, and how it silently regressed once already.

### 4.9 Paper portfolio performance tracker
- **Design decisions made for this feature** (resolving the open questions from the old Section 9.1): shown as a prominent section on the public homepage (not a separate route); overlays an S&P 500 (SPY) benchmark line from the start; admin enters a ticker, share count, and an entry date (defaults to today, but can be back-dated — see below).
- **`paper_portfolio` Supabase table** — see Section 5 for schema. RLS follows the same public-SELECT / admin-only-write pattern as `portfolio`.
- **`lib/yahooHistory.ts`** — shared Yahoo Finance history helper, extracted from `app/api/history/route.ts` so both that route and the new performance route use the same fetch/parse logic. Adds a `5Y` range (weekly interval), a `periodSince(date)` helper that picks the smallest Yahoo range bucket covering a given start date (Yahoo only accepts fixed range buckets, not arbitrary spans), and a `priceOnOrBefore(points, date)` helper that finds the latest close at or before a given date (used for back-dated entries — falls back to the prior trading day on weekends/holidays).
- **`app/api/paper-portfolio/route.ts`** — GET (public, lists holdings), POST (admin-only: takes `{ ticker, shares, entryDate }`; if `entryDate` is today (or omitted) it uses the live Finnhub quote as `entry_price`, otherwise it fetches Yahoo history for that ticker and uses `priceOnOrBefore` to find that day's close — this is what makes back-dating work, since the performance calc (below) already keyed everything off `entry_date` rather than assuming "today"), DELETE (admin-only, by id).
- **`app/api/paper-portfolio/performance/route.ts`** — GET (public), takes `?period=` (`1D`, `1W`, `6M`, `1M`, `YTD`, `1Y`; defaults to `1M`). Computes an ARKK-fund-page-style time series **for the selected window**:
  - Maps the UI period to a Yahoo range bucket (`1W` → Yahoo's `5D`, since Yahoo has no native 1-calendar-week range) and fetches that range for every held ticker plus `SPY` in parallel.
  - Uses SPY's own timestamps as the axis backbone (it trades every session) and forward-fills each other ticker's price onto that axis (a holding's price on a timestamp it didn't trade at uses the most recent known close).
  - Sums `shares × price` per axis point (only across holdings whose `entry_date` has passed) for portfolio value, trims any leading points where nothing was held yet, then **rebases both the portfolio and SPY lines to 0% at the first point of the selected window** — so each period button shows performance *during that window*, not the since-inception curve just zoomed in.
  - The headline `totalValue`/`totalCost`/`totalReturnPct` (all-time, shown regardless of the selected period) still come from each holding's true `entry_price` vs. its latest fetched price — unaffected by which window is selected.
  - Also returns a holdings breakdown (current price/value, $ and % gain per position).
  - Note: because the underlying data is daily (or weekly for 1Y/YTD spans that run long), `1D`/`1W` show Yahoo's intraday points (5m/15m) but a portfolio that hasn't traded within the window will look flat — this is a NAV-style tracker, not a live intraday ticker.
- **`app/admin/PaperPortfolioForm.tsx`** — admin UI: ticker, shares, and entry-date (`<input type="date">`, max=today) inputs, list of current holdings with entry price/date and a remove button. Composed into `app/admin/page.tsx` alongside the existing forms.
- **`app/PaperPortfolio.tsx`** — public homepage component: headline total value + return % **for the currently selected period** (e.g. "-5.05% (1W)" — this updates as the period buttons are clicked, it does not stay fixed to an all-time figure), period buttons (1D/1W/1M/6M/YTD/1Y, mirroring `StockChart.tsx`'s pattern) that re-fetch the performance endpoint, an "S&P 500" toggle button that shows/hides the dashed SPY benchmark line (and its legend entry) without refetching, a Recharts line chart (portfolio % return vs. SPY % return for the selected window), a **Market Exposure section** (see below), and a holdings table (ticker, shares, value, gain/loss $ and % — this one stays lifetime/all-time per position, since it's a factsheet-style breakdown rather than the chart) whose **rows are clickable**: clicking a ticker opens the same `StockChart` modal the old watchlist used, via a `selectedTicker` state (identical pattern to the removed `PriceList`). Renders nothing if there are no holdings yet or the table isn't reachable, so it fails safe on the public homepage. Composed into `app/page.tsx`, now the homepage's only holdings display (Section 4.2).
- **Market Exposure section** — two horizontal stacked allocation bars ("by holding" and "by sector"), each with a swatch legend showing label + %. Followed this repo's `dataviz` skill guidance: part-to-whole data defaults to a **stacked bar**, not a pie chart (pies aren't even in the skill's form table); colors come from the skill's validated dark-mode categorical palette (8 fixed hues, e.g. blue `#3987e5`, orange `#d95926`, ... — see `references/palette.md`), assigned by each ticker/sector's **first-seen order** in the holdings list (a stable identity), not by its sorted display rank, so a holding doesn't change color as prices move it up or down the bar. Beyond the 7-slice token ceiling the skill specifies, the remainder folds into a muted-gray "Other" slice. Segments have the skill's 2px surface gap between them (via flex `gap`), and "Unknown" sector is used as a fallback bucket for a holding whose sector lookup failed.
- **Sector data (`paper_portfolio.sector`)** — added via `supabase/paper_portfolio_add_sector.sql` migration. **Fetched once and cached, not looked up on every page load**, per the user's explicit ask: `lib/sector.ts` calls Finnhub's free `/stock/profile2` endpoint (returns `finnhubIndustry`) at **add-time** in the POST route, and the performance route does a **one-time backfill** for any older row where `sector` is still `null` (e.g. rows added before this existed), persisting the result via `supabaseAdmin` so it's never re-fetched for that ticker again. A brand-new position added later always fetches its own sector at insert time either way.
- **Setup:** both `supabase/paper_portfolio.sql` and `supabase/paper_portfolio_add_sector.sql` have been run in the Supabase SQL editor — the table, its RLS policy, and the `sector` column all exist in production.
- **Chart tooltip shows the underlying $ value alongside the % return** — hovering a point shows e.g. "Portfolio: 10.25% ($3,496)" and "S&P 500 (SPY): 0.02% ($772.67)". Chose the tooltip over a second Y-axis/extra visible lines because portfolio value (thousands of dollars) and SPY's price (hundreds of dollars) are on incompatible scales from the % lines — a second axis would visually clutter the chart without adding clarity. The performance API now returns raw `spyPrice` per point (previously computed internally but discarded) alongside the already-present `portfolioValue`.
- **Admin dashboard has a "← Back to site" link** next to Log Out (mirroring the one already on `/admin/login`), so the owner isn't stuck without a nav path back to the public homepage.
- **Finary-inspired visual redesign (homepage only, by request — Section 2.1):** a `Card` wrapper (`bg-[var(--color-card)]`, Section 4.8) now holds the chart, the two exposure bars, and the holdings list as distinct surfaces against the page background, in a centered column (originally `max-w-3xl`; widened to `max-w-5xl` with a two-column grid once the Daily Briefing panel was added — Section 4.10). The headline shows the total value on its own line, then a row below with the period's plain-colored `$` delta and a **pill badge** (`GainBadge`, green/red at ~20% opacity — not themed, same convention as other gain/loss indicators) for the `%` — matching the two-part layout in Finary's own dashboard (screenshots the user provided directly), rather than one combined figure. Period buttons became a pill-shaped segmented control. The holdings table became a row-list (ticker + share count on the left, value + gain/loss pill on the right) rather than an HTML `<table>`, closer to how Finary-style dashboards present a holdings list.
- **Color palette matched to Finary's actual dashboard** (from screenshots the user provided, not the marketing site) — done by updating the *live* `site_settings` values via the admin API, not just code defaults: `background_color` → near-black `#0a0a0a` (was a mid-gray `#343434`), `primary_color` → warm amber/gold `#e5a94a` (was purple `#a300f0`). `text_color` stayed white. These are still fully editable later from `/admin`'s ThemeEditor — nothing is hardcoded; the update just set the *current* values to this palette.
- **Chart now uses a Recharts `ComposedChart`+`Area`** (was `LineChart`+`Line`) so the portfolio series gets a soft gradient glow fading from `var(--color-primary)` at ~30% opacity to transparent under the line, matching the glow visible under the line in Finary's own charts — a single `Area` element carries both the stroke and the fill (avoids a duplicate Tooltip row that a separate overlapping `Line` on the same dataKey would otherwise cause). `CartesianGrid` dropped `vertical` gridlines (horizontal-only now, in both this chart and `StockChart.tsx`'s per-ticker modal), matching the reference screenshots — no chart in either component has vertical gridlines anymore.
- Colors/spacing/fonts still flow entirely through the existing admin-customizable theme system — nothing here is a hardcoded Finary palette; see the `card_background_color` addition in Section 4.8. The line/gradient color is `var(--color-primary)`, so changing that picker in `/admin` reshades the chart too.
- Verified end-to-end in a real Chromium browser (Playwright), at both desktop and mobile widths: headline % changes across periods, SPY line/legend toggle correctly, exposure bars render with correct percentages/colors, clicking a holdings-row opens that ticker's chart modal, the "My Portfolio" heading is confirmed gone from the rendered page, and the new "Card background" picker renders correctly in `/admin`.

### 4.10 Daily briefing
- **`app/DailyBriefing.tsx`** — client component rendered in a right-hand column, imported and placed *inside* `PaperPortfolio.tsx` rather than in `app/page.tsx`: the hero (headline value + delta) stays full-width above a `grid-cols-[1fr_320px]` row that starts at the chart card, so the briefing panel's top edge lines up with the chart's top edge rather than the hero — a deliberate layout fix (it originally sat in `page.tsx`'s own grid alongside the whole `<PaperPortfolio>` block, which pulled its top edge above the hero text). Stacks below the holdings list on mobile. Fetches `/api/daily-briefing` on mount; renders nothing if there's no cached briefing yet or it's empty, so it fails safe like the other homepage sections. Each ticker section lists its headlines as links (opens the source article in a new tab) with the source name underneath.
- **Right column stays fixed while scrolling — a CSS Grid + `position: sticky` interaction worth documenting.** `lg:sticky lg:top-6` originally lived on `DailyBriefing`'s own div, with the grid's `align-items` set to `start`. That combination made the right column's grid item size to only its own (short) content height, so once the page scrolled past that height, the sticky element ran out of room and unstuck early — it visibly slid away while the taller left column (chart/exposure/holdings) kept scrolling, which is what "the briefing moves while scrolling" looked like in practice. **Fix:** removed `items-start` from the grid (so grid items default to `align-items: stretch`, making the right column's *grid area* — its containing block for sticky purposes — as tall as the left column, per the CSS Grid spec, regardless of the child's own rendered height) and moved `lg:sticky lg:top-6 lg:self-start` onto the wrapper `<div>` that holds both `DailyBriefing` and `EarningsCalendar` together (so they stick as one unit, not just the briefing alone leaving the earnings calendar behind). Verified directly by scripting a scroll to the very bottom of the page: the right column stayed pinned near the top of the viewport the entire time, only reaching its natural end when the left column's own content did.
- **Not generated on page load or by any user-facing request.** A `daily_briefing` Supabase table (single row, `id=1` — schema in Section 5) holds whatever was last generated; `app/api/daily-briefing/route.ts` (public GET) just reads that row.
- **`app/api/cron/daily-briefing/route.ts`** — the actual generator. Gated behind `request.headers.get('authorization') === 'Bearer ' + process.env.CRON_SECRET` (a new env var, Section 6) rather than the existing admin-session check, since this route isn't called by a logged-in admin — it's called by Vercel's Cron infrastructure. On each run it: reads the *current* unique tickers from `paper_portfolio`, calls Finnhub's free `/company-news` endpoint per ticker (confirmed working on the free tier — returns headline, source, a short `summary`, and a URL, so no separate AI summarization call is needed for a "headline roundup"), takes the 4 most recent deduplicated headlines per ticker from the last 3 days, and upserts the whole thing into `daily_briefing`.
- **Why a real cron job and not generate-on-first-visit:** the user's requirement was that adding a new ticker to the paper portfolio must not affect the briefing until the *next calendar day* — guaranteed, not "usually true." A lazily-generated-on-first-visit design would violate this exactly when a ticker is added before anyone visits the site that day (very plausible for a personal site the owner checks right after adding a position). A scheduled job that snapshots tickers at a fixed time each day, independent of visits, is what makes the guarantee real. Configured in `vercel.json` (`crons: [{ path: "/api/cron/daily-briefing", schedule: "0 12 * * *" }]`) — Vercel's Hobby plan allows cron jobs at up to once-daily frequency, which this fits.
- **Relevance filter, added after the initial version let through unrelated articles.** Confirmed directly that Finnhub's `/company-news` `related` field is not a real relevance signal — it tags *every* returned article with the queried ticker regardless of actual topic (a query for a semiconductor holding returned an Adobe-earnings story and an IMF global-growth-forecast story, both tagged `"related": "MTSI"`). The cron route now keeps an article only if its own headline/summary text actually names the ticker symbol, the company's name (first significant word, fetched via `lib/sector.ts`'s `fetchCompanyName`), or a keyword derived from that holding's own `sector` (e.g. "Semiconductors" → "semiconductor") — i.e. "matching ticker or matching industry (as already shown in Market Exposure)," per the explicit ask. All whole-word, case-insensitive matches (`\bword\b`) to avoid substring false positives (a ticker like "MU" matching inside "Municipal"). Verified directly: re-running the cron dropped MTSI's 3 unrelated articles (none mentioned "MTSI", "MACOM", or "semiconductor") while keeping a genuinely on-topic FIGR article; the other three tickers simply had zero Finnhub coverage in the lookback window, confirming the filter isn't over-aggressive, just that there was nothing to filter for those.
- **Setup:** `supabase/daily_briefing.sql` (table + RLS policy) has been run in the Supabase SQL editor. `CRON_SECRET` has been generated and added to Vercel's production environment via `vercel env add`; it's also in `.env.local` for local testing (the cron route was exercised manually with `curl -H "Authorization: Bearer $CRON_SECRET" ...` before Vercel's own scheduler ever ran it).

### 4.11 Upcoming earnings calendar
- **`app/EarningsCalendar.tsx`** — stacked directly below `DailyBriefing` in the same right-hand column (both inside `PaperPortfolio.tsx`). Fetches `/api/earnings-calendar` on mount; renders nothing if there are no upcoming events, same fail-safe pattern as the other homepage sections.
- **`app/api/earnings-calendar/route.ts`** — public GET, **not cached** (unlike the daily briefing): reads the current `paper_portfolio` tickers and calls Finnhub's free `/calendar/earnings` endpoint per ticker (confirmed working on the free tier) for the next 90 days, resolves each ticker's company name via the same `fetchCompanyName` helper the briefing uses, sorts all events by date, and returns the soonest 10. Chose live-on-every-request over the briefing's once-a-day-cron approach because: (a) there was no "don't show a new position's data until tomorrow" requirement for this feature the way there was for the briefing, and (b) it's only one Finnhub call per portfolio ticker per page load — trivial against the 60/min free-tier limit for a personal-sized portfolio.
- **Each row:** a date badge (weekday + day number), the company name, an honest market-timing label when Finnhub provides one (**"Before Market Open" / "After Market Close" / "During Market Hours"** — deliberately not a fabricated clock time; the free tier's `hour` field is only `bmo`/`amc`/`dmh`, not a precise time like the reference screenshot showed, and inventing one would be misleading), `Q{quarter} {year}` · EPS est. · Rev est. (revenue compacted to K/M/B), and a **"+ Add to calendar"** link that opens a prefilled Google Calendar event (all-day, title + EPS/Revenue estimates in the description) — no backend/ICS generation needed, just a `calendar.google.com/calendar/render` URL built client-side. Verified the generated links resolve to correctly-dated, correctly-titled events.
- **Scope note:** "industry presentations/investor events" (asked for alongside earnings) were not built — no free API for that was found (see Section 9.3).

---

## 5. Database Schema (Supabase)

### `portfolio`
| Column | Type | Notes |
|---|---|---|
| id | int8 | primary key, auto-increment |
| created_at | timestamptz | default `now()` |
| ticker | text | uppercase stock symbol |

RLS: public SELECT policy ("Enable read access for all users"). No public INSERT/UPDATE/DELETE policy — writes go through `supabaseAdmin` (service_role key) inside authenticated API routes only.

### `site_settings`
| Column | Type | Notes |
|---|---|---|
| id | int8 | primary key; only row `id=1` is used |
| primary_color | text | hex without `#` |
| background_color | text | hex without `#` |
| text_color | text | hex without `#` |
| card_background_color | text | nullable; hex without `#`. Unset = falls back to a `color-mix()`-derived shade of `background_color` (see Section 4.8) |
| card_opacity | integer | nullable, 0-100; how opaque cards are (`--color-card` is composed via `color-mix(..., transparent)` at this %) — lower values let the background gradient show through. Defaults to 85 when unset. |
| font_family | text | CSS font-family value |
| spacing_scale | text | `compact` \| `normal` \| `spacious` |
| border_radius | text | CSS value e.g. `8px` |

RLS: public SELECT policy. No public UPDATE policy — writes via `supabaseAdmin` in the settings PUT route only. Confirmed directly (via the live `/api/settings` response, which omits any column that doesn't exist) that **neither `card_background_color` nor `card_opacity` had actually been applied** as of this writing, despite an earlier note in this doc claiming the former was — both are defined in `supabase/site_settings_add_card_color.sql` and `supabase/site_settings_add_card_opacity.sql` respectively and need to be run in the Supabase SQL editor before their corresponding `/admin` pickers can save.

### `paper_portfolio`
| Column | Type | Notes |
|---|---|---|
| id | bigint (identity) | primary key |
| created_at | timestamptz | default `now()` |
| ticker | text | uppercase stock symbol |
| shares | numeric | share count |
| entry_price | numeric | live Finnhub quote if added at today's date, else that day's Yahoo closing price (back-dated entries) |
| entry_date | date | defaults to today; admin can pick any past date to back-date a position |
| sector | text | nullable; Finnhub `finnhubIndustry`, fetched once at add-time (or backfilled once for older rows) and cached — never re-fetched on page load |

RLS: public SELECT policy. No public INSERT/UPDATE/DELETE policy — writes via `supabaseAdmin` in `app/api/paper-portfolio/route.ts` (and the performance route's one-time sector backfill) only. Schema/policy defined in `supabase/paper_portfolio.sql`; the `sector` column added later via `supabase/paper_portfolio_add_sector.sql`. **Both have now actually been run** — see the Section 7 lesson below; an earlier note in this doc claiming the `sector` migration was already live was wrong.

### `daily_briefing`
| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key, always `1` (`check (id = 1)`) — single-row cache, not a growing history table |
| briefing_date | date | the date this briefing was generated |
| content | jsonb | array of `{ ticker, headlines: [{ headline, summary, source, url, datetime }] }` |
| updated_at | timestamptz | default `now()` |

RLS: public SELECT policy. No public INSERT/UPDATE/DELETE policy — writes only via `supabaseAdmin` in the cron route (`app/api/cron/daily-briefing/route.ts`), which itself is gated by `CRON_SECRET` rather than an admin session (Section 4.10). Schema/policy defined in `supabase/daily_briefing.sql`, run in the Supabase SQL editor.

---

## 6. Environment Variables

All of these must exist in **both** `.env.local` (local dev) and Vercel → Settings → Environment Variables (production) — they do not sync automatically between the two.

| Variable | Purpose | Exposed to browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes (public/Config type in Vercel) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS-gated) | Yes (public/Config type in Vercel) |
| `SUPABASE_SERVICE_ROLE_KEY` | Full-access Supabase key, used only in server-side API routes | No (Secret type in Vercel) |
| `ADMIN_PASSWORD` | Single shared password for `/admin` login | No (Secret type in Vercel) |
| `SESSION_SECRET` | Compared directly against submitted session cookie value | No (Secret type in Vercel) |
| `FINNHUB_API_KEY` | Live quote API access | No (Secret type in Vercel) |
| `CRON_SECRET` | Authorizes calls to `/api/cron/daily-briefing` (checked against the request's `Authorization: Bearer` header) | No (Secret type in Vercel; added via `vercel env add`, not the dashboard) |

Actual values live only in `.env.local` on the local machine and in the Vercel dashboard — not reproduced in this document.

---

## 7. Known Issues, Gotchas, and Lessons Learned

These are worth knowing before making further changes, since each one caused real debugging time in this project:

1. **Env var changes require a full dev server restart.** Next.js only reads `.env.local` at server startup. `Ctrl+C` then `npm run dev` again after any `.env.local` edit.
2. **GitHub → Vercel auto-deploy has been unreliable.** On multiple occasions, pushing to `main` did not trigger a new Vercel build (webhook silently didn't fire), even though the Git integration showed as connected with the right settings. **Reliable fallback:** run `vercel --prod` directly (Vercel CLI, installed globally via `npm install -g vercel`, authenticated via `vercel login`). Use `vercel --prod --force` to bypass build cache if a stale-looking deploy is suspected.
3. **Production builds enforce stricter TypeScript checking than `npm run dev`.** A chart tooltip formatter typed as `(value: number) =>` compiled and ran fine locally but failed Vercel's `npm run build` step with a real type error, because Recharts' types allow `undefined`. Fixed by typing the parameter as `any` and explicitly calling `Number(value)`. **Lesson:** if something works locally but fails only on deploy, check the Vercel build log for TypeScript errors first — don't assume it's an env var or caching issue. **This recurred** when building the paper portfolio's chart (`app/PaperPortfolio.tsx`): the Tooltip `formatter`'s `name` parameter is typed as `NameType | undefined` by Recharts, so it must also be typed loosely (`any`) rather than `string` — same root cause, same fix.
4. **Two files named `page.tsx` in similar-looking paths caused repeated mix-ups**: `app/page.tsx` (public homepage) vs. `app/admin/page.tsx` (dashboard) vs. `app/admin/login/page.tsx` (login form). On at least two occasions, code intended for one `page.tsx` was pasted into the wrong one, causing confusing "module not found" build errors (importing a component that only exists relative to a different folder) or the wrong content displaying at a route. **Always confirm the exact file path/breadcrumb in the editor before pasting.**
5. **Row Level Security policies are per-table, not project-wide.** Adding a "public read" policy to the `portfolio` table did not automatically extend to the new `site_settings` table — each table needs its own explicit policy, or Supabase queries silently return zero rows (which surfaced as a confusing "Cannot coerce the result to a single JSON object" error when using `.single()` on an empty result). The same applies to the new `paper_portfolio` table — its policy is defined in `supabase/paper_portfolio.sql` and must be applied separately.
6. **Next.js `middleware.ts` runs in Edge Runtime, which does not support Node's built-in `crypto` module.** An initial version of `lib/session.ts` used `crypto.createHmac(...)` and this caused the middleware to fail to load at all (silently, no protection was actually active) with a console warning about "Node.js module ... not supported in the Edge Runtime." Fixed by removing the crypto dependency entirely and using a direct string comparison against `SESSION_SECRET` instead — sufficient for this single-password-owner use case.
7. **Finnhub's free tier does not include historical candle/chart data for US equities** (as of this project, confirmed via their docs/support — it returned 403 on the `/stock/candle` endpoint). This is why historical charts use Yahoo Finance's endpoint instead, which needs no key at all. This also applies to the paper portfolio's performance series (Section 4.9), which reuses the same Yahoo endpoint via `lib/yahooHistory.ts`.
8. **Vercel's Deployment Protection ("Vercel Authentication") setting can accidentally gate the actual production URL**, prompting outside visitors to log into a Vercel account just to view the public site — the opposite of the "publicly accessible" requirement. Fix: Vercel → Settings → Deployment Protection → set to "Only Preview Deployments" (or fully disabled).
9. **API call budgeting:** Finnhub free tier is a rolling 60-calls-per-minute limit (not a daily quota that resets at a fixed time). With N tickers, each refresh cycle costs N calls. At 5 tickers, a 15-second refresh interval uses ~20 calls/minute — safe. A 2-second interval would have used ~150 calls/minute with 5 tickers, well over the limit — this was caught and corrected before implementation. Note: adding a paper portfolio position costs one additional Finnhub call (to stamp `entry_price`), but this only happens on admin add, not on any refresh loop.
10. **Next.js 16 deprecates the `middleware.ts` file convention** in favor of a `proxy.ts` convention (seen as a build warning: "The 'middleware' file convention is deprecated. Please use 'proxy' instead."). Not yet migrated — `middleware.ts` still works and a codemod (`npx @next/codemod@canary middleware-to-proxy`) exists for when this gets addressed. Flagged here so it isn't mistaken for a new bug.
11. **`app/page.tsx` and `app/admin/page.tsx` were being statically prerendered at build time — a serious one, since it silently broke "admin edits take effect without a redeploy."** Neither page calls a Request-time API (`cookies()`, `headers()`, `searchParams`) directly, so Next.js's default `dynamic = 'auto'` prerendered them once during `next build`/`vercel --prod` and served that same frozen snapshot to every visitor (confirmed by the build output marking both routes `○` Static, not `ƒ` Dynamic). Symptom: deleting a paper portfolio holding from `/admin` showed the "Deleted!" toast (the DELETE request genuinely succeeded) but the row stayed listed, because `router.refresh()` just re-served the identical static payload rather than re-querying Supabase — same root cause would have hidden new/removed tickers on the public homepage too. Confirmed only reproducible against a real production build (`next start`), not `next dev` (dev always renders fresh). **Fix:** added `export const dynamic = 'force-dynamic'` to both page files, which flips them to server-rendered-per-request. This is *not* the same axis as `fetch()`'s own `cache` option (which already defaults to not-cached in this Next version) — a page can still be statically prerendered around fully uncached fetches if nothing forces it dynamic, which is exactly what happened here.
12. **The `paper_portfolio.sector` migration was never actually run, and a silent bug hid that fact for a long time.** `supabase/paper_portfolio_add_sector.sql` was written and this doc claimed it had been applied, but it hadn't — confirmed directly: `select('*')` on the table simply had no `sector` key at all, and an explicit `select('ticker, sector')` returned Postgres error 42703 ("column ... does not exist"). The reason it looked like it was working: the performance route's one-time backfill (Section 4.9) fired `supabaseAdmin.update({ sector })` calls without checking their result for an `error`, then *unconditionally* set the in-memory JS object's `.sector` field regardless of whether the write succeeded. So every request recomputed sector fresh from Finnhub (since the DB column never actually held a value, `!h.sector` was true every time) and returned that live value in the API response — masquerading as a working cache, while quietly making a live Finnhub call per unique ticker on *every single page load*, defeating the entire "fetch once, cache it, don't ask again until something changes" requirement this feature was built for. Only surfaced when the daily-briefing cron route's own `select('ticker, sector')` call — written with proper error checking — immediately errored instead of masking the problem. **Fix:** actually ran the migration (confirmed via a direct script against the DB, not just an assumption), and added error logging to the backfill's update results so a future persistence failure shows up in server logs instead of silently degrading into a live-lookup-every-request pattern. **Lesson:** when a `Promise.all` of database writes has no per-result error check, a systemic write failure becomes invisible — the code path that reads the data right back out (in the same request) can make the bug look like success.
13. **The `force-dynamic` fix from lesson #11 silently regressed on the homepage — a good example of fixing a symptom's location instead of its source.** `app/page.tsx` originally had `export const dynamic = 'force-dynamic'` specifically because *it* did a server-side Supabase fetch. When that fetch was removed (Section 4.2, replacing the watchlist with the paper portfolio tracker), the export was dropped along with it — reasonable given page.tsx's own code, but wrong, because `app/layout.tsx` *also* does a server-side settings fetch on every request, and nothing forced *that* to stay dynamic. Confirmed directly via the build output: `/` had quietly gone back to `○` Static. Consequence: a theme change made in `/admin` (including the new gradient/opacity settings below) would render correctly for the admin's own session (since `/admin` has its own `force-dynamic`) but would **not** reach the public homepage until the next `vercel --prod` deploy — the exact bug lesson #11 already fixed once, back from a different angle. **Fix:** moved `export const dynamic = 'force-dynamic'` onto `app/layout.tsx` itself, at the actual source of the per-request data, rather than leaving it as something every current and future page has to remember to declare independently. Confirmed via build output that *every* route is now `ƒ` Dynamic. **Lesson:** when the fix for "stale data" is `force-dynamic` on a *page*, ask whether the data actually originates in a shared layout instead — the fix belongs where the fetch is, not wherever the symptom was first noticed.

---

## 8. Design Reference Notes: Finary (for the redesign objective)

Research summary only — no Finary assets, code, or exact branding to be copied; this describes the general product category and UX patterns to draw inspiration from:

- Finary is a net-worth/wealth tracking app. Core UX centers on a single unifying number (total net worth) with drill-down into asset categories (stocks, crypto, real estate, etc.).
- Emphasizes real-time-feeling performance charts, clean card-based layouts, and prominent gain/loss visualization.
- Provides "performance reports," diversification insights, and comparison views.
- Product's overall aesthetic (based on general familiarity with this app category, not verified pixel-for-pixel here): dark-mode-friendly, minimal chrome, large confident typography for headline numbers, generous whitespace, small colored badges/pills for percentage changes, smooth line charts as the dominant visual element.
- **Actionable takeaway for this project:** the existing theme system (Section 4.8) already supports changing colors/fonts/spacing site-wide, which is a reasonable foundation for moving toward this aesthetic. The paper portfolio section's large headline total + return-percentage line (Section 4.9) is a first, small step in this direction. The bigger lift will likely still be broader layout/typography changes (card structure, spacing rhythm across the whole homepage) rather than just this one section.

---

## 9. Roadmap — Not Yet Built

### 9.1 Paper portfolio performance tracker
**Built — see Section 4.9**, including back-dated entries (admin picks any past date; entry price is looked up from Yahoo history rather than typed in manually, to keep the data trustworthy). Remaining follow-ups, if wanted later: a dedicated `/paper-portfolio` route if the homepage section grows too large; additional benchmarks beyond SPY; editing an existing position's shares/date instead of remove-and-re-add.

### 9.2 Daily briefing section
**Built — see Section 4.10.** Went straight to the automated path (headline roundup from Finnhub, not manual entry), generated once a day by a real Vercel Cron job rather than on-demand, per explicit requirements: (1) a ticker added to the paper portfolio shouldn't affect the briefing until the *next* day's run, and (2) "summarize" meant a headline roundup, not an AI-written prose summary (avoids adding a new paid LLM dependency).

### 9.3 Earnings call date tracker
**Built (earnings only) — see Section 4.11.** Confirmed directly that Finnhub's `/calendar/earnings` endpoint works on the free tier. "Industry presentations/investor events" (also requested alongside this) were **not** built — no free data source for that was found; Finnhub's free-tier calendar endpoints cover earnings, IPOs, and economic events, not company-specific investor conferences/presentations. Revisit if a source turns up.

### 9.4 Projects tab
Not started. Originally scoped as a separate route/tab displaying research papers and modeling work — titles, short descriptions, and links or embedded PDFs, likely stored directly in the GitHub repo or Supabase storage rather than a separate hosting service.

### 9.5 Broader Finary-inspired redesign
**Built for the public homepage — see Section 4.9** (card-based layout, hero number, pill badges for gains/losses, row-list holdings). By explicit request, scoped to the homepage only — `/admin` was left with its plain functional look, and could get the same treatment later if wanted.

---

## 10. Current File Structure

```
app/
  api/
    admin/
      login/route.ts
      logout/route.ts
    cron/
      daily-briefing/route.ts  (Vercel Cron target, gated by CRON_SECRET — not an admin-session route)
    daily-briefing/route.ts    (public GET, just reads the cached row)
    earnings-calendar/route.ts (public GET, live — not cached, see Section 4.11)
    history/route.ts
    paper-portfolio/
      route.ts
      performance/route.ts
    portfolio/route.ts
    quote/route.ts
    settings/route.ts
  admin/
    login/page.tsx
    page.tsx
    AdminPortfolioForm.tsx
    PaperPortfolioForm.tsx
    LogoutButton.tsx
    ThemeEditor.tsx
  page.tsx
  layout.tsx
  StockChart.tsx          (still used — now opened from PaperPortfolio's holdings table, not the removed PriceList)
  PaperPortfolio.tsx
  DailyBriefing.tsx
  EarningsCalendar.tsx
  globals.css
lib/
  supabaseClient.ts     (public anon-key client)
  supabaseAdmin.ts      (service_role client — server-only, never import into client components)
  session.ts            (session token create/verify — deliberately non-cryptographic, see Section 7.6)
  yahooHistory.ts        (shared Yahoo Finance history fetch/parse, used by /api/history and /api/paper-portfolio/performance)
  sector.ts               (Finnhub sector/industry lookup — called at add-time and for the one-time backfill, never per page load)
supabase/
  paper_portfolio.sql             (manual migration — table + RLS policy for paper_portfolio; run in Supabase SQL editor)
  paper_portfolio_add_sector.sql  (manual migration — adds the sector column; run in Supabase SQL editor)
  site_settings_add_card_color.sql (manual migration — adds card_background_color; NOT yet run, see Section 5)
  daily_briefing.sql               (manual migration — table + RLS policy for daily_briefing; run in Supabase SQL editor)
middleware.ts             (protects /admin/* routes)
vercel.json                (Vercel Cron config — daily-briefing generation, once a day)
```

---

## 11. Deployment Checklist (for any future changes)

1. Make code changes locally, test at `localhost:3000` with `npm run dev`.
2. `git add . && git commit -m "..." && git push`
3. Run `vercel --prod` as well, since auto-deploy from GitHub has been unreliable in this project (see Section 7.2).
4. If a new environment variable was introduced, add it to Vercel BEFORE or immediately after deploying, or the production build/runtime will fail.
5. If a new Supabase table was introduced (e.g. `paper_portfolio`), run its migration SQL in the Supabase SQL editor before or immediately after deploying — schema changes are not part of the Vercel deploy and won't apply themselves.
6. If the build fails, check the Vercel build log (via the Inspect URL printed by the CLI, or the Deployments tab) for the actual TypeScript/module error rather than assuming it's a caching or env var issue.
7. Hard-refresh (Ctrl+Shift+R) or test in an incognito window when verifying a fix live — browser caching has caused confusion about whether a deploy actually worked.
