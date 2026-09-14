import { ImageResponse } from 'next/og'

export const alt = 'Aiden Loc — Paper Portfolio & Equity Research'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Deliberately static branding rather than the live portfolio value: LinkedIn and
// other crawlers cache OG images aggressively, so a rendered number would be
// frozen at whatever it was when the link was first scraped and would go stale
// (and misleading) from then on. Colors are hardcoded rather than read from the
// admin theme for the same reason -- plus it keeps image generation free of a
// database round-trip that could fail at scrape time.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#07070a',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: '#8b8b96',
            }}
          >
            Paper Portfolio
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              color: '#ffffff',
              marginTop: 20,
              lineHeight: 1.05,
            }}
          >
            Aiden Loc
          </div>
          <div
            style={{
              fontSize: 34,
              color: '#b9b9c4',
              marginTop: 26,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            A simulated equity portfolio tracked against the S&amp;P 500 — with the thesis behind every
            position.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', width: 64, height: 6, background: '#7c5cff' }} />
          <div style={{ fontSize: 26, color: '#8b8b96', letterSpacing: 1 }}>
            Equity research · Full-stack engineering
          </div>
        </div>
      </div>
    ),
    size
  )
}
