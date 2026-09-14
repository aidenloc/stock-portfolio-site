import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Replaces the stock create-next-app Next.js logo that shipped as app/favicon.ico.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07070a',
          color: '#ffffff',
          fontSize: 20,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        AL
      </div>
    ),
    size
  )
}
