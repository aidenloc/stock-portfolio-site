import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { supabase } from "@/lib/supabaseClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://stock-portfolio-site.vercel.app";
const SITE_DESCRIPTION =
  "Aiden Loc — a simulated equity portfolio tracked against the S&P 500, plus resume and engineering projects.";

export const metadata: Metadata = {
  // Required for the OG image and other relative metadata URLs to resolve to
  // absolute ones; without it Next warns and social crawlers get a broken path.
  metadataBase: new URL(SITE_URL),
  // Each route sets its own short title and it renders as "Portfolio | Aiden Loc".
  title: {
    default: "Aiden Loc — Paper Portfolio & Equity Research",
    template: "%s | Aiden Loc",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Aiden Loc",
    url: SITE_URL,
    title: "Aiden Loc — Paper Portfolio & Equity Research",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Aiden Loc — Paper Portfolio & Equity Research",
    description: SITE_DESCRIPTION,
  },
};

// The layout's own settings fetch has no Request-time API, so without this,
// Next prerenders it once at build time and every route (not just the ones
// that happen to declare their own force-dynamic) freezes on whatever theme
// was live at the last deploy — a theme change in /admin wouldn't reach the
// public homepage until the next redeploy. Setting it here, at the actual
// source of the per-request data, means no page needs to remember this on
// its own (page.tsx briefly regressed exactly this way after a rewrite).
export const dynamic = 'force-dynamic'

async function getSiteSettings() {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()
  return data
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings()

  const spacingMap = { compact: 0.75, normal: 1, spacious: 1.5 }

  // Card opacity (0-100, admin-adjustable) controls how much of the ambient
  // background gradient shows through card surfaces. color-mix with
  // "transparent" works whether the base is a picked hex or the color-mix
  // fallback shade below, so this composes cleanly either way.
  const cardOpacity = settings?.card_opacity ?? 85
  const cardBase = settings?.card_background_color
    ? `#${settings.card_background_color.replace('#', '')}`
    : 'color-mix(in srgb, var(--color-bg) 100%, white 8%)'

  const themeStyle = {
    '--color-bg': settings?.background_color ? `#${settings.background_color.replace('#', '')}` : '#000000',
    '--color-text': settings?.text_color ? `#${settings.text_color.replace('#', '')}` : '#ffffff',
    '--color-primary': settings?.primary_color ? `#${settings.primary_color.replace('#', '')}` : '#2563eb',
    // Card surface for the dashboard's card-based layout. Left unset by an
    // admin, it derives a subtle lifted shade from the background instead of
    // a hardcoded color, so it adapts to whatever background is picked.
    '--color-card': `color-mix(in srgb, ${cardBase} ${cardOpacity}%, transparent)`,
    '--font-family': settings?.font_family || 'sans-serif',
    '--border-radius': settings?.border_radius || '8px',
    '--spacing-unit': spacingMap[settings?.spacing_scale as keyof typeof spacingMap] ?? 1,
  } as React.CSSProperties

  // Ambient corner glow, tinted with the (admin-adjustable) primary color —
  // stylistic inspiration from Finary's own dashboard background, not a copied
  // asset. Sits behind the flat --color-bg via a layered background-image, so
  // it's visible everywhere without needing every page to opt in.
  const bodyBackground =
    `radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 45%), ` +
    `radial-gradient(circle at 100% 15%, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 40%), ` +
    `var(--color-bg)`

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={themeStyle}
    >
      <body
        className="min-h-full flex flex-col"
        style={{
          background: bodyBackground,
          backgroundAttachment: 'fixed',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {children}
      </body>
    </html>
  );
}