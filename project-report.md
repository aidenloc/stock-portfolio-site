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
- Plain sync component — no server-side data fetching happens here anymore (see 4.2). Renders `Header`, `PaperPortfolio` (Section 4.9, does its own client-side fetching), and `Footer`.
- One of three tabs now (Portfolio/Aiden/Projects — Section 4.13); stays at the root `/` since it's the original core app, by explicit user decision when the other two tabs were added.
- Has a small, deliberately understated "Admin" text link in the footer linking to `/admin/login` (not a prominent button — this is for the site owner, not visitors).

### 4.2 Removed: the original live watchlist ("My Portfolio" / `app/PriceList.tsx`)
- The original design (live-quote watchlist with 15s auto-refresh while the market is open, `isMarketOpen()` NYSE-hours check, green/red gain coloring) has been **removed from the homepage and deleted** (`app/PriceList.tsx` no longer exists) — the paper portfolio tracker (Section 4.9) is now the homepage's only holdings display, per this phase's redesign.
- Update: `AdminPortfolioForm.tsx` and `app/api/portfolio/route.ts` have since been **deleted outright** (confirmed unused elsewhere) once the owner asked for the redundant "Manage Portfolio" admin section to be removed — see Section 4.7. The underlying `portfolio` Supabase table itself was left untouched (no code references it anymore, but dropping a live table wasn't part of the ask).
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
- Protected by middleware. Composes three sections, each wrapped in the shared `Card` component so the dashboard now visually matches the public site's card-based layout:
  - `PaperPortfolioForm.tsx` — add/edit/remove positions in the `paper_portfolio` table (Section 4.9).
  - `ThemeEditor.tsx` — see Section 4.8.
  - `LogoutButton.tsx` — clears session, redirects to login.
- **Update: the old "Manage Portfolio" section (`AdminPortfolioForm.tsx`, backed by `app/api/portfolio/route.ts` and the `portfolio` table) has been removed entirely**, per the owner's explicit request once it became redundant — the paper portfolio tracker had already fully replaced the live watchlist on the public site (Section 4.2), so this admin form no longer had anything left to manage. Both files were deleted outright (confirmed nothing else referenced them) rather than left as dead code. The underlying Supabase `portfolio` table was left alone (dropping a live table wasn't part of the ask).
- The page itself now uses the same container/spacing conventions as the public site (`max-w-[1000px] mx-auto`, `--spacing-unit`-based padding) instead of a bare `p-8`.

### 4.7b SEO and link sharing
- **Per-route metadata.** The root layout holds `metadataBase` (required, or relative OG URLs don't resolve to absolute ones for crawlers), a `title.template` of `"%s | Aiden Loc"`, and default description/openGraph/twitter. Each route then exports its own `title`/`description`/`canonical`.
- **Two Next-specific traps here, both caught by reading the rendered `<head>` rather than assuming:**
  - A root layout's `title.template` does **not** apply to `app/page.tsx` — the root page is the *same* route segment as the root layout, not a child of it. A plain `title: 'Portfolio'` rendered as a bare `"Portfolio"` with no name attached. The homepage therefore uses `title: { absolute: ... }`.
  - Declaring an `openGraph` object in a child segment **replaces** the parent's rather than deep-merging, which silently dropped the `images` that `app/opengraph-image.tsx` contributes at the root — `og:image` went `null` on `/experience` and `/projects` while still looking fine on `/`. Those two routes now repeat `images: ['/opengraph-image']` explicitly. This one would have shipped as broken LinkedIn previews on two of three pages.
- **`app/opengraph-image.tsx`** — 1200x630 card generated with `ImageResponse`. Deliberately *static branding*, not the live portfolio value: crawlers cache OG images aggressively, so a rendered figure would freeze at whatever it was when the link was first scraped and go stale. Colors are hardcoded rather than read from the admin theme for the same reason, and to keep image generation free of a DB round-trip that could fail at scrape time. Note Satori (which backs `ImageResponse`) supports only a subset of CSS — flexbox only, and every element with multiple children needs an explicit `display: flex`.
- **Favicon** — the project was still shipping the stock create-next-app Next.js logo (`app/favicon.ico`, 25931 bytes, untouched since day one). Replaced with `app/icon.tsx`, an "AL" monogram generated the same way.
- **`app/robots.ts` and `app/sitemap.ts`** — sitemap lists the three public routes; robots disallows `/admin` and `/api/`. The admin subtree additionally sends `noindex, nofollow` via `app/admin/layout.tsx` (a layout, because `app/admin/login/page.tsx` is a client component and client components cannot export `metadata`).

### 4.8 Full theme system
- **`site_settings` Supabase table** (single row, `id=1`): `primary_color`, `background_color`, `text_color`, `card_background_color` (added for the Finary-style card layout, Section 4.9 — nullable), `card_opacity` (added for the ambient-gradient look below — nullable, 0-100), `font_family`, `spacing_scale` (compact/normal/spacious), `border_radius`.
- **`app/api/settings/route.ts`**: GET is public (anyone loading the site needs to read the current theme); PUT is admin-only (session-cookie-gated, uses `supabaseAdmin`). The PUT handler just spreads whatever fields it's given into an `update()` call, so adding new fields has never required route changes.
- **`app/layout.tsx`**: server component, fetches settings on every request, computes a `themeStyle` object of CSS custom properties (`--color-bg`, `--color-text`, `--color-primary`, `--color-card`, `--font-family`, `--border-radius`, `--spacing-unit` — the last one is a numeric multiplier: compact=0.75, normal=1, spacious=1.5), and applies them via the `style` prop on the `<html>` tag. **`--color-card`** is the one exception to "just use the DB value or a hardcoded fallback": if `card_background_color` is unset, it falls back to the CSS expression `color-mix(in srgb, var(--color-bg) 100%, white 8%)` — a lifted shade computed *from whatever background is picked*, rather than a hardcoded hex that could look wrong against a custom background. That base color (picked or derived) is then composed through a second `color-mix(..., transparent)` at `card_opacity`% (default 85 when unset), so **the same variable already carries both the color and the admin-adjustable transparency** — no component needs to know about opacity separately, `bg-[var(--color-card)]` just works.
- **Ambient background gradient** (this phase's Finary-coloring-effects request): `<body>`'s `background` is two stacked `radial-gradient()`s (soft corner glows) tinted with `color-mix(in srgb, var(--color-primary) X%, transparent)`, layered over the flat `--color-bg`, `background-attachment: fixed` so it doesn't scroll with content. Because the glow's hue is literally `var(--color-primary)`, it automatically follows whatever primary color is picked in `/admin` — no separate "gradient color" setting needed. Stylistic inspiration only (glow position/spread was hand-tuned to the look in reference screenshots, not copied assets).
- **Components updated to use theme variables:** buttons (`bg-[var(--color-primary)]`), borders/backgrounds in `StockChart` and `PaperPortfolio` (`rounded-[var(--border-radius)]`, spacing via `calc(var(--spacing-unit)*Xrem)` in Tailwind arbitrary values, card surfaces via `bg-[var(--color-card)]`).
- **Intentionally NOT themed** (kept as fixed colors for functional/legibility reasons): green/red gain-loss indicators (including the pill-style `GainBadge`, Section 4.9) and the red "Remove"/"Delete" action text.
- **Update:** admin form inputs (text/number/date fields and `<select>`s in `PaperPortfolioForm.tsx` and `ThemeEditor.tsx`) were originally hardcoded white-background/black-text regardless of theme; they've since been restyled to use the theme variables too (`bg-[var(--color-bg)]`, themed border, `text-[var(--color-text)]`), per the owner's request to bring the admin dashboard's look in line with the rest of the site.
- **`ThemeEditor.tsx`** (in `/admin`): color pickers (`<input type="color">`) for primary/background/text/card background, a **card-transparency range slider** (20-100%, labeled with the live percentage), a `<select>` for border radius (0/4/8/16px presets), a `<select>` for a curated font list (sans-serif, serif, monospace, Georgia, Helvetica), and a `<select>` for spacing scale. Saves via PUT to `/api/settings`, then calls `router.refresh()`.
- **Setup:** `supabase/site_settings_add_card_color.sql` and `supabase/site_settings_add_card_opacity.sql` have both now actually been run in the Supabase SQL editor and confirmed live (see Section 5 and the Section 7 lesson on this — the opacity picker briefly appeared to "not save," which was really the whole settings PUT failing against a column that didn't exist yet).
- **`app/layout.tsx` now has its own `export const dynamic = 'force-dynamic'`** — see the Section 7 lesson on why this matters specifically for settings-driven rendering, and how it silently regressed once already.

### 4.9 Paper portfolio performance tracker
- **Design decisions made for this feature** (resolving the open questions from the old Section 9.1): shown as a prominent section on the public homepage (not a separate route); overlays an S&P 500 (SPY) benchmark line from the start; admin enters a ticker, share count, and an entry date (defaults to today, but can be back-dated — see below).
- **`paper_portfolio` Supabase table** — see Section 5 for schema. RLS follows the same public-SELECT / admin-only-write pattern as `portfolio`.
- **`lib/yahooHistory.ts`** — shared Yahoo Finance history helper, extracted from `app/api/history/route.ts` so both that route and the new performance route use the same fetch/parse logic. Adds a `5Y` range (weekly interval), a `periodSince(date)` helper that picks the smallest Yahoo range bucket covering a given start date (Yahoo only accepts fixed range buckets, not arbitrary spans), and a `priceOnOrBefore(points, date)` helper that finds the latest close at or before a given date (used for back-dated entries — falls back to the prior trading day on weekends/holidays).
- **`app/api/paper-portfolio/route.ts`** — GET (public, lists holdings), POST (admin-only: takes `{ ticker, shares, entryDate }`; if `entryDate` is today (or omitted) it uses the live Finnhub quote as `entry_price`, otherwise it fetches Yahoo history for that ticker and uses `priceOnOrBefore` to find that day's close — this is what makes back-dating work, since the performance calc (below) already keyed everything off `entry_date` rather than assuming "today"), DELETE (admin-only, by id), and **PUT (admin-only, added so existing holdings can be edited rather than only deleted-and-re-added)** — takes `{ id, ticker, shares, entryDate }` and re-resolves the entry price/sector the same way POST does (both now share a `resolveEntry()` helper), then updates the row in place.
- **`app/api/paper-portfolio/performance/route.ts`** — GET (public), takes `?period=` (`1D`, `1W`, `6M`, `1M`, `YTD`, `1Y`; defaults to `1M`). Computes an ARKK-fund-page-style time series **for the selected window**:
  - Maps the UI period to a Yahoo range bucket (`1W` → Yahoo's `5D`, since Yahoo has no native 1-calendar-week range) and fetches that range for every held ticker plus `SPY` in parallel.
  - Uses SPY's own timestamps as the axis backbone (it trades every session) and forward-fills each other ticker's price onto that axis (a holding's price on a timestamp it didn't trade at uses the most recent known close).
  - Sums `shares × price` per axis point (only across holdings whose `entry_date` has passed) for portfolio value, trims any leading points where nothing was held yet, then **rebases both the portfolio and SPY lines to 0% at the first point of the selected window** — so each period button shows performance *during that window*, not the since-inception curve just zoomed in.
  - The headline `totalValue`/`totalCost`/`totalReturnPct` (all-time, shown regardless of the selected period) still come from each holding's true `entry_price` vs. its latest fetched price — unaffected by which window is selected.
  - Also returns a holdings breakdown (current price/value, $ and % gain per position).
  - Note: because the underlying data is daily (or weekly for 1Y/YTD spans that run long), `1D`/`1W` show Yahoo's intraday points (5m/15m) but a portfolio that hasn't traded within the window will look flat — this is a NAV-style tracker, not a live intraday ticker.
- **`app/admin/PaperPortfolioForm.tsx`** — admin UI: ticker, shares, and entry-date (`<input type="date">`, max=today) inputs, list of current holdings with entry price/date, and per-row **Edit**/Remove actions. Composed into `app/admin/page.tsx`. **Update:** clicking Edit swaps that row for an inline form (ticker/shares/date inputs + Save/Cancel) instead of requiring delete-and-re-add to correct a position — Save calls the new PUT endpoint above, which recomputes the price server-side rather than trusting a client-supplied one.
- **`app/PaperPortfolio.tsx`** — public homepage component: headline total value + return % **for the currently selected period** (e.g. "-5.05% (1W)" — this updates as the period buttons are clicked, it does not stay fixed to an all-time figure), period buttons (1D/1W/1M/6M/YTD/1Y, mirroring `StockChart.tsx`'s pattern) that re-fetch the performance endpoint, an "S&P 500" toggle button that shows/hides the dashed SPY benchmark line (and its legend entry) without refetching, a Recharts line chart (portfolio % return vs. SPY % return for the selected window), a **Market Exposure section** (see below), and a holdings table (ticker, shares, value, gain/loss $ and % — this one stays lifetime/all-time per position, since it's a factsheet-style breakdown rather than the chart) whose **rows are clickable**: clicking a ticker opens the same `StockChart` modal the old watchlist used, via a `selectedTicker` state (identical pattern to the removed `PriceList`). Renders nothing if there are no holdings yet or the table isn't reachable, so it fails safe on the public homepage. Composed into `app/page.tsx`, now the homepage's only holdings display (Section 4.2).
- **Market Exposure section** — two horizontal stacked allocation bars ("by holding" and "by sector"), each with a swatch legend showing label + %. Followed this repo's `dataviz` skill guidance: part-to-whole data defaults to a **stacked bar**, not a pie chart (pies aren't even in the skill's form table); colors come from the skill's validated dark-mode categorical palette (8 fixed hues, e.g. blue `#3987e5`, orange `#d95926`, ... — see `references/palette.md`), assigned by each ticker/sector's **first-seen order** in the holdings list (a stable identity), not by its sorted display rank, so a holding doesn't change color as prices move it up or down the bar. Beyond the 7-slice token ceiling the skill specifies, the remainder folds into a muted-gray "Other" slice. Segments have the skill's 2px surface gap between them (via flex `gap`), and "Unknown" sector is used as a fallback bucket for a holding whose sector lookup failed.
- **Sector data (`paper_portfolio.sector`)** — added via `supabase/paper_portfolio_add_sector.sql` migration. **Fetched once and cached, not looked up on every page load**, per the user's explicit ask: `lib/sector.ts` calls Finnhub's free `/stock/profile2` endpoint (returns `finnhubIndustry`) at **add-time** in the POST route, and the performance route does a **one-time backfill** for any older row where `sector` is still `null` (e.g. rows added before this existed), persisting the result via `supabaseAdmin` so it's never re-fetched for that ticker again. A brand-new position added later always fetches its own sector at insert time either way.
- **Setup:** `supabase/paper_portfolio.sql`, `supabase/paper_portfolio_add_sector.sql`, and `supabase/paper_portfolio_add_thesis.sql` have all been run in the Supabase SQL editor — the table, its RLS policy, and the `sector` and `thesis` columns all exist in production. The thesis column was verified directly (`select('id, thesis')` succeeds) **and** end-to-end through the real admin UI: edit a holding → type a thesis → Save → full page reload → value still there → chevron appears on the public homepage and expands it. That two-step check (direct query *and* a real UI round-trip after a reload) is the standing remedy for the Section 7 lessons about migrations that were assumed-applied but weren't.
- **Investment thesis per holding (`paper_portfolio.thesis`, nullable text)** — added so the homepage reads as real equity research rather than a bare tracker. Editable per-holding in `/admin` (a textarea in both the add form and the inline edit row); on the public homepage, a holding with a thesis gets a small chevron next to its ticker (`aria-expanded`, `aria-label` describing the action) that expands an italic one-line summary below the row without triggering the row's own click-to-open-chart handler (the chevron button calls `stopPropagation()`). `resolveEntry()` in `app/api/paper-portfolio/route.ts` (shared by POST and PUT) now also accepts and trims `thesis`, storing `null` if empty. **The theses themselves are not fabricated by Claude** — the field ships empty for existing holdings; the owner writes their own reasoning per position via the admin form, since inventing financial analysis in someone's name for real visitors to read would be dishonest.
- **Portfolio return is time-weighted (TWR), not (end − start) / start.** This was a real bug found while adding entry markers — see the Section 7 lesson. Each step backs out that step's contribution before measuring growth (`stepGain = value − contribution − prevValue`), and the steps are chain-linked. `contribution` is the cost (`shares × entry_price`) of any position whose `entry_date` first falls inside that step, so opening a position adds to value and contribution equally and produces no fake spike. The series also carries a running `portfolioGainDollar`, because the headline's `$` delta had the identical flaw (it was `endValue − startValue`). Cross-check: over a window covering the whole history, the chained gains sum to exactly `totalValue − totalCost` ($5,232.80).
- **Loading skeleton** — the section used to `return null` until the fetch resolved, so the page showed a blank gap then snapped into place. `PortfolioSkeleton` now mirrors the real layout's shape. A period switch keeps the previous chart on screen at reduced opacity (`aria-busy`) instead of swapping in a "Loading..." block that collapsed the chart's height and jumped the page.
- **Chart accessibility** — the range buttons were already keyboard-reachable (they're real `<button>`s; confirmed by tabbing to one and pressing Enter). The actual gap was that *selected* state was conveyed by background colour alone, so the range group and the S&P toggle now carry `aria-pressed`, the group has a `role="group"` label, and each button has a spoken label ("Show past month" — "1M" reads as "one em"). The chart itself carries a text equivalent in an `sr-only` paragraph quoting both return figures, since an SVG is opaque to a screen reader no matter how the container is labelled.
- **Entry markers** — `ReferenceDot` per position opened inside the visible window, labelled with the ticker, with a "Position opened" key below the chart. Labels alternate top/bottom when two entries fall within 4% of the window span (MTSI and WOLF are six days apart and collided). **Entries only** — the schema holds one `entry_date`/`entry_price` per row with no sell or add-to-position records, so this is deliberately not a full trade history; that would need a separate trades table.
- **Holdings table (sortable, 8 columns)** — replaced the stacked ticker/value row-list with a real `<table>`: Ticker, Shares, Avg Cost, Price, Market Value, Day, Total Gain/Loss, Weight. Sorting is client-side, defaults to Market Value descending, and each `<th>` carries `aria-sort` while the header itself is a real `<button>` (so it's keyboard-reachable, verified with an Enter keypress). Two traps worth knowing:
  - **Sorting must not repaint the exposure bars.** `buildExposure()` assigns colors by first-seen order in the array it's handed, so the table sorts a *copy* (`sortRows` returns a new array) and the exposure bars keep reading the original API order. Verified by diffing the legend before/after clicking headers.
  - **Nulls sort last in both directions**, so flipping direction doesn't drag empty Day cells to the top.
- **Day change (`dayChangeDollar` / `dayChangePct`)** — derived from the Yahoo history already being fetched, so it costs no extra Finnhub budget. The subtlety: `1D` and `1W` come back at 5m/15m intervals, so "the second-to-last point" there is a *five-minute-old price*, not yesterday's close. `previousDailyClose()` therefore buckets points by calendar date and takes the last close of the previous **date**. On top of that, both intraday ranges fetch one compact `1M` daily range for their baseline — without that, 1W drifted ~0.05-0.25pp from the other periods because its prior-date bar lands a few minutes before the official close. Verified by querying all six periods and confirming identical day-change figures. The percentage is measured against the same `currentPrice` shown in the Price column, so the row reconciles with itself.
- **WCAG AA contrast, measured rather than eyeballed** — a Playwright script reads each element's computed color, resolves it through a 1x1 canvas (necessary: Tailwind v4 emits `oklch()` and the card surface is a `color-mix()`, neither of which a naive `rgba()` regex can parse — an earlier version of the script silently fell through to pure black and reported everything as passing), composites alpha backgrounds down to an opaque base, and computes the ratio. Result: the green/red gain badges pass comfortably (8.49:1 and 6.16:1), but the **inactive sort-header labels at `text-gray-500` measured 4.19:1, under AA's 4.5 for that size** — bumped to `text-gray-400` (7.79:1). Note `text-gray-500` is still used for decorative eyebrow labels elsewhere on the site and fails at the same ratio there; not changed, since that's a broader visual decision.
- **Portfolio positioning statement** — a one-line "who/why" sentence now sits above the "Paper Portfolio" eyebrow (e.g. "A simulated portfolio I manage to practice equity research and macro positioning — real trade decisions, tracked against the S&P 500, with no real capital at risk."), so the page doesn't open on a bare number with no framing. The old disclaimer line under the headline was shortened to just "Tracked for performance only — not real money." to avoid repeating itself now that the framing lives above.
- **Chart tooltip shows the underlying $ value alongside the % return** — hovering a point shows e.g. "Portfolio: 10.25% ($3,496)" and "S&P 500 (SPY): 0.02% ($772.67)". Chose the tooltip over a second Y-axis/extra visible lines because portfolio value (thousands of dollars) and SPY's price (hundreds of dollars) are on incompatible scales from the % lines — a second axis would visually clutter the chart without adding clarity. The performance API now returns raw `spyPrice` per point (previously computed internally but discarded) alongside the already-present `portfolioValue`.
- **Admin dashboard has a "← Back to site" link** next to Log Out (mirroring the one already on `/admin/login`), so the owner isn't stuck without a nav path back to the public homepage.
- **Finary-inspired visual redesign (homepage only, by request — Section 2.1):** a `Card` wrapper (`bg-[var(--color-card)]`, Section 4.8) now holds the chart, the two exposure bars, and the holdings list as distinct surfaces against the page background, in a centered column (`max-w-3xl` → `max-w-5xl` once Daily Briefing was added (Section 4.10) → **`max-w-[1600px]`**, per a later "feels cramped, widen it" request referencing a wider Finary screenshot — the right column also grew from 320px to 380px and card/row padding increased throughout to fill the extra space rather than just stretching the same cramped proportions wider). The headline shows the total value on its own line, then a row below with the period's plain-colored `$` delta and a **pill badge** (`GainBadge`, green/red at ~20% opacity — not themed, same convention as other gain/loss indicators) for the `%` — matching the two-part layout in Finary's own dashboard (screenshots the user provided directly), rather than one combined figure. Period buttons became a pill-shaped segmented control. The holdings table became a row-list (ticker + share count on the left, value + gain/loss pill on the right) rather than an HTML `<table>`, closer to how Finary-style dashboards present a holdings list.
- **Color palette matched to Finary's actual dashboard** (from screenshots the user provided, not the marketing site) — done by updating the *live* `site_settings` values via the admin API, not just code defaults: `background_color` → near-black `#0a0a0a` (was a mid-gray `#343434`), `primary_color` → warm amber/gold `#e5a94a` (was purple `#a300f0`). `text_color` stayed white. These are still fully editable later from `/admin`'s ThemeEditor — nothing is hardcoded; the update just set the *current* values to this palette.
- **Chart now uses a Recharts `ComposedChart`+`Area`** (was `LineChart`+`Line`) so the portfolio series gets a soft gradient glow fading from `var(--color-primary)` at ~30% opacity to transparent under the line, matching the glow visible under the line in Finary's own charts — a single `Area` element carries both the stroke and the fill (avoids a duplicate Tooltip row that a separate overlapping `Line` on the same dataKey would otherwise cause). `CartesianGrid` dropped `vertical` gridlines (horizontal-only now, in both this chart and `StockChart.tsx`'s per-ticker modal), matching the reference screenshots — no chart in either component has vertical gridlines anymore.
- Colors/spacing/fonts still flow entirely through the existing admin-customizable theme system — nothing here is a hardcoded Finary palette; see the `card_background_color` addition in Section 4.8. The line/gradient color is `var(--color-primary)`, so changing that picker in `/admin` reshades the chart too.
- Verified end-to-end in a real Chromium browser (Playwright), at both desktop and mobile widths: headline % changes across periods, SPY line/legend toggle correctly, exposure bars render with correct percentages/colors, clicking a holdings-row opens that ticker's chart modal, the "My Portfolio" heading is confirmed gone from the rendered page, and the new "Card background" picker renders correctly in `/admin`.

### 4.10 Daily briefing
- **`app/DailyBriefing.tsx`** — client component rendered in a right-hand column, imported and placed *inside* `PaperPortfolio.tsx` rather than in `app/page.tsx`: the hero (headline value + delta) stays full-width above a `grid-cols-[1fr_320px]` row that starts at the chart card, so the briefing panel's top edge lines up with the chart's top edge rather than the hero — a deliberate layout fix (it originally sat in `page.tsx`'s own grid alongside the whole `<PaperPortfolio>` block, which pulled its top edge above the hero text). Stacks below the holdings list on mobile. Fetches `/api/daily-briefing` on mount; renders nothing if there's no cached briefing yet or it's empty, so it fails safe like the other homepage sections. Each ticker section lists its headlines as links (opens the source article in a new tab) with the source name underneath.
- **Right column stays fixed while scrolling — a CSS Grid + `position: sticky` interaction worth documenting.** `lg:sticky lg:top-6` originally lived on `DailyBriefing`'s own div, with the grid's `align-items` set to `start`. That combination made the right column's grid item size to only its own (short) content height, so once the page scrolled past that height, the sticky element ran out of room and unstuck early — it visibly slid away while the taller left column (chart/exposure/holdings) kept scrolling, which is what "the briefing moves while scrolling" looked like in practice. **Fix:** removed `items-start` from the grid (so grid items default to `align-items: stretch`, making the right column's *grid area* — its containing block for sticky purposes — as tall as the left column, per the CSS Grid spec, regardless of the child's own rendered height) and moved `lg:sticky lg:top-6 lg:self-start` onto the wrapper `<div>` that holds both `DailyBriefing` and `EarningsCalendar` together (so they stick as one unit, not just the briefing alone leaving the earnings calendar behind). Verified directly by scripting a scroll to the very bottom of the page: the right column stayed pinned near the top of the viewport the entire time, only reaching its natural end when the left column's own content did.
- **Not generated on page load or by any user-facing request.** A `daily_briefing` Supabase table (single row, `id=1` — schema in Section 5) holds whatever was last generated; `app/api/daily-briefing/route.ts` (public GET) just reads that row.
- **Briefing lookback widened from 3 days to 14 (and 4 headlines/ticker to 3), on measured evidence.** The briefing had been showing a single headline. Measuring raw Finnhub volume against what survives the relevance filter, for this portfolio's actual holdings: **3 days → 1 raw article, 0 kept; 7 days → 16 raw, 9 kept; 14 days → 34 raw, 23 kept.** So the filter was not the problem (it keeps ~68% at 14 days) — small caps just don't generate daily coverage, and the window was too narrow to catch what exists. After the change the briefing carries 11 headlines across 4 of 5 tickers (WOLF has genuinely zero coverage even at 14 days, so it's simply absent). Because a two-week window means some headlines are days old, each one now shows its own age ("3d ago") rather than letting the briefing's date imply everything below it is same-day news.
- **`app/api/cron/daily-briefing/route.ts`** — the actual generator. Gated behind `request.headers.get('authorization') === 'Bearer ' + process.env.CRON_SECRET` (a new env var, Section 6) rather than the existing admin-session check, since this route isn't called by a logged-in admin — it's called by Vercel's Cron infrastructure. On each run it: reads the *current* unique tickers from `paper_portfolio`, calls Finnhub's free `/company-news` endpoint per ticker (confirmed working on the free tier — returns headline, source, a short `summary`, and a URL, so no separate AI summarization call is needed for a "headline roundup"), takes the 4 most recent deduplicated headlines per ticker from the last 3 days, and upserts the whole thing into `daily_briefing`.
- **Why a real cron job and not generate-on-first-visit:** the user's requirement was that adding a new ticker to the paper portfolio must not affect the briefing until the *next calendar day* — guaranteed, not "usually true." A lazily-generated-on-first-visit design would violate this exactly when a ticker is added before anyone visits the site that day (very plausible for a personal site the owner checks right after adding a position). A scheduled job that snapshots tickers at a fixed time each day, independent of visits, is what makes the guarantee real. Configured in `vercel.json` (`crons: [{ path: "/api/cron/daily-briefing", schedule: "0 12 * * *" }]`) — Vercel's Hobby plan allows cron jobs at up to once-daily frequency, which this fits.
- **Relevance filter, added after the initial version let through unrelated articles.** Confirmed directly that Finnhub's `/company-news` `related` field is not a real relevance signal — it tags *every* returned article with the queried ticker regardless of actual topic (a query for a semiconductor holding returned an Adobe-earnings story and an IMF global-growth-forecast story, both tagged `"related": "MTSI"`). The cron route now keeps an article only if its own headline/summary text actually names the ticker symbol, the company's name (first significant word, fetched via `lib/sector.ts`'s `fetchCompanyName`), or a keyword derived from that holding's own `sector` (e.g. "Semiconductors" → "semiconductor") — i.e. "matching ticker or matching industry (as already shown in Market Exposure)," per the explicit ask. All whole-word, case-insensitive matches (`\bword\b`) to avoid substring false positives (a ticker like "MU" matching inside "Municipal"). Verified directly: re-running the cron dropped MTSI's 3 unrelated articles (none mentioned "MTSI", "MACOM", or "semiconductor") while keeping a genuinely on-topic FIGR article; the other three tickers simply had zero Finnhub coverage in the lookback window, confirming the filter isn't over-aggressive, just that there was nothing to filter for those.
- **Setup:** `supabase/daily_briefing.sql` (table + RLS policy) has been run in the Supabase SQL editor. `CRON_SECRET` has been generated and added to Vercel's production environment via `vercel env add`; it's also in `.env.local` for local testing (the cron route was exercised manually with `curl -H "Authorization: Bearer $CRON_SECRET" ...` before Vercel's own scheduler ever ran it).

### 4.11 Upcoming earnings calendar
- **`app/EarningsCalendar.tsx`** — stacked directly below `DailyBriefing` in the same right-hand column (both inside `PaperPortfolio.tsx`). Fetches `/api/earnings-calendar` on mount; renders nothing if there are no upcoming events, same fail-safe pattern as the other homepage sections.
- **`app/api/earnings-calendar/route.ts`** — public GET, **not cached** (unlike the daily briefing): reads the current `paper_portfolio` tickers and calls Finnhub's free `/calendar/earnings` endpoint per ticker (confirmed working on the free tier) for the next 90 days, resolves each ticker's company name via the same `fetchCompanyName` helper the briefing uses, sorts all events by date, and returns the soonest 10. Chose live-on-every-request over the briefing's once-a-day-cron approach because: (a) there was no "don't show a new position's data until tomorrow" requirement for this feature the way there was for the briefing, and (b) it's only one Finnhub call per portfolio ticker per page load — trivial against the 60/min free-tier limit for a personal-sized portfolio.
- **Each row:** a date badge (weekday + day number), the company name, an honest market-timing label when Finnhub provides one (**"Before Market Open" / "After Market Close" / "During Market Hours"** — deliberately not a fabricated clock time; the free tier's `hour` field is only `bmo`/`amc`/`dmh`, not a precise time like the reference screenshot showed, and inventing one would be misleading), `Q{quarter} {year}` · EPS est. · Rev est. (revenue compacted to K/M/B), and a **"+ Add to calendar"** link that opens a prefilled Google Calendar event (all-day, title + EPS/Revenue estimates in the description) — no backend/ICS generation needed, just a `calendar.google.com/calendar/render` URL built client-side. Verified the generated links resolve to correctly-dated, correctly-titled events.
- **Scope note:** "industry presentations/investor events" (asked for alongside earnings) were not built — no free API for that was found (see Section 9.3).

### 4.12 Header and footer
- **`app/Header.tsx`** / **`app/Footer.tsx`** — minimal top/bottom bars, composed into each public page (`/`, `/aiden`, `/projects` — `/admin` keeps its own bespoke header). Style takes inspiration from welcra.com's minimal personal-site header/footer (logo-left header with no background/border distinction; centered, sparse footer).
- **Footer:** centered `© {year} Aiden Loc · Admin` (name updated by request; was a generic "Portfolio" placeholder), with a subtle top hairline (`border-[var(--color-text)]/10`, consistent with the hairline convention already used elsewhere, e.g. the holdings list). **The "Admin" link itself is unchanged from before** — same understated small-gray-text treatment, just relocated from a bare `<div>` at the bottom of `page.tsx` into this footer component, kept low-visibility rather than promoted into the nav (original intent, Section 4.1).
- **Header became a real tab bar once the multi-page structure below was built** — see Section 4.13.

### 4.13 Experience / Projects tabs (multi-page navigation)
- **Scope decision (user-confirmed):** the stock portfolio dashboard stays at `/` (the existing core app, unchanged); `/experience` and `/projects` are new routes alongside it, not a replacement of the homepage. This also finally builds the original plan's "Separate tab — displays personal projects" objective (Section 1) and Section 9.4's Projects tab, now as one of three tabs rather than a single "Projects" destination.
- **`app/Header.tsx`** — client component (`usePathname()` from `next/navigation`) rendering three tabs — Portfolio (`/`), Experience (`/experience`), Projects (`/projects`) — with the active tab bold/white and inactive ones muted gray. The brand wordmark on the left ("Aiden Loc") always links to `/`, independent of which tab is active. Route/label originally shipped as "Aiden" (`/aiden`) for one turn, then renamed to "Experience" (`/experience`, folder renamed too so the URL matches the label) once real resume content was ready to go in.
- **`app/Card.tsx`** — extracted from `PaperPortfolio.tsx` (which now imports it) since the same card surface treatment was needed on the new pages too; three+ use sites was the threshold for pulling it into a shared component rather than continuing to inline-duplicate it.
- **`app/experience/page.tsx`** — resume page, reformatted to match welcra.com's layout pattern (screenshots the user provided): large centered serif name (`font-serif`, a one-off departure from the site's own adjustable `--font-family` — intentional, matching the reference's display treatment for the name specifically, not the whole page), a centered row of contact links (Resume / Email / Phone / LinkedIn), then numbered sections (`01 ---- EDUCATION`, `02 ---- EXPERIENCE`, `03 ---- EXTRACURRICULAR EXPERIENCE`, `04 ---- TECHNICAL SKILLS`) each with a horizontal rule and small-caps title on the right, mirroring welcra's own section-divider style. **All content is transcribed directly from the resume PDF the user provided** (`Loc_Aiden_Resume.pdf`) — Education, Experience, Extracurricular Experience, and Technical Skills entries, verbatim bullet points, not paraphrased or fabricated.
- **`public/resume.pdf`** — the actual resume file, copied in from the user's local `Downloads` folder (found via a filesystem search once the user attached it) so the "Resume" link on the page is a real, working download rather than a dead link. Verified directly: `GET /resume.pdf` returns `200` with `content-type: application/pdf`.
- **`app/projects/page.tsx`** — "Research & Modeling" placeholder page for the future equity research/DCF modeling content mentioned in the original objectives (Section 1, Section 9.4). No content system built yet (no CMS/admin form for posting research) — just the page shell and a "nothing published yet" message.
- All three pages share the same outer container width (`max-w-[1600px]`, so the header/footer chrome lines up identically when switching tabs); `/experience` narrows to `max-w-3xl` around the actual resume content, since that reads better than stretched across a wide dashboard-style column.
- Verified via Playwright: all three tabs navigate and highlight correctly, the resume PDF link resolves, and the layout holds at ~1200px and 400px (mobile) without wrapping issues.

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

RLS: public SELECT policy. No public UPDATE policy — writes via `supabaseAdmin` in the settings PUT route only. Both `card_background_color` and `card_opacity` were defined (`supabase/site_settings_add_card_color.sql`, `supabase/site_settings_add_card_opacity.sql`) well before they were actually run — a repeat of the same "migration file exists in the repo but was never actually applied" pattern as `paper_portfolio.sector` (Section 7, lesson #12). This time it surfaced as a *reported* bug rather than a silently-masked one: the admin saw the opacity slider revert to 85% after every save, since the whole `PUT` (all fields, not just `card_opacity`) was failing against the missing column — confirmed directly via a script against the DB, then via a real save-and-read-back cycle after the user ran both migrations. Both columns are now live in production.

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
| thesis | text | nullable; free-text investment thesis, admin-editable, shown as an expandable row on the public homepage. Added via `supabase/paper_portfolio_add_thesis.sql` — run and verified live. |

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
14. **The performance chart counted deposited capital as investment return — for a year it claimed +1,596%.** `portfolioReturnPct` was `(value − valueAtWindowStart) / valueAtWindowStart`. On the 1Y window this portfolio starts at $975 (VOR was the only holding on 2025-11-13) and ends at $16,540, but almost all of that rise is cash added when MTSI, WOLF, STTK and FIGR were opened. Measured figures before the fix: 1Y +1,596.4%, YTD +191.1%, 6M +32.6%, against a true return on cost of +46.3% — and a y-axis running to +2,100%. The headline's `$` delta had the same flaw ($15,565 "gain"). **Found by accident**: the entry markers added in the same pass sat exactly on the vertical steps, which is what made the cause obvious — the chart was a staircase with one step per position opened. **Fix:** chain-linked time-weighted return, backing each step's contribution out before measuring growth (the method fund fact sheets use), which is also the only way the portfolio line is honestly comparable to the SPY line drawn beside it. Now 1Y +93.95% vs SPY +13.73%. **Two lessons:** (a) any "return" figure over a window where money can be added is wrong unless contributions are explicitly neutralised — this is the single most important number on the site and it was wrong for months; (b) 1M was *unaffected* by the bug (no positions opened in that window), so the default view looked entirely plausible while the longer windows were nonsense — a bug that hides in the view you look at least often. The regression test is cheap: over a window spanning the whole history, summed step gains must equal `totalValue − totalCost`.
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
**Page shell built — see Section 4.13** (`/projects`, part of the Portfolio/Experience/Projects tab bar). Still not started: any actual content or a way to publish it — titles, short descriptions, links or embedded PDFs for research papers/DCF models, likely stored directly in the GitHub repo or Supabase storage rather than a separate hosting service, plus (if it should be admin-editable rather than hand-edited in the repo) an admin form similar to the paper portfolio's.

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
    quote/route.ts
    settings/route.ts
  admin/
    login/page.tsx
    page.tsx
    PaperPortfolioForm.tsx  (add/edit/remove — PUT support added for in-place edits)
    LogoutButton.tsx
    ThemeEditor.tsx
  page.tsx                (Portfolio tab — root /)
  experience/page.tsx     (Experience tab — real resume content, welcra-inspired layout; was /aiden with placeholder content)
  projects/page.tsx       (Projects tab — research/DCF modeling, placeholder content)
  layout.tsx
  Header.tsx              (3-tab nav bar, client component — usePathname() for active-tab highlight)
  Footer.tsx
  Card.tsx                (shared card surface, extracted from PaperPortfolio.tsx once other pages needed it too)
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
public/
  resume.pdf                (Aiden's actual resume, linked from /experience)
supabase/
  paper_portfolio.sql             (manual migration — table + RLS policy for paper_portfolio; run in Supabase SQL editor)
  paper_portfolio_add_sector.sql  (manual migration — adds the sector column; run in Supabase SQL editor)
  paper_portfolio_add_thesis.sql  (manual migration — adds the thesis column; run in Supabase SQL editor, confirmed live)
  site_settings_add_card_color.sql (manual migration — adds card_background_color; run in Supabase SQL editor, confirmed live)
  site_settings_add_card_opacity.sql (manual migration — adds card_opacity; run in Supabase SQL editor, confirmed live)
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
