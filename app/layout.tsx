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

export const metadata: Metadata = {
  title: "My Portfolio",
  description: "Personal stock portfolio tracker",
};

async function getSiteSettings() {
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()
  return data
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings()

  const spacingMap = { compact: 0.75, normal: 1, spacious: 1.5 }

  const themeStyle = {
    '--color-bg': settings?.background_color ? `#${settings.background_color.replace('#', '')}` : '#000000',
    '--color-text': settings?.text_color ? `#${settings.text_color.replace('#', '')}` : '#ffffff',
    '--color-primary': settings?.primary_color ? `#${settings.primary_color.replace('#', '')}` : '#2563eb',
    '--font-family': settings?.font_family || 'sans-serif',
    '--border-radius': settings?.border_radius || '8px',
    '--spacing-unit': spacingMap[settings?.spacing_scale as keyof typeof spacingMap] ?? 1,
  } as React.CSSProperties

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={themeStyle}
    >
      <body
        className="min-h-full flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {children}
      </body>
    </html>
  );
} 