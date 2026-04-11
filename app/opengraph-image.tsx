import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'wegbrait.com'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadFont(name: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    // Old UA → Google Fonts returns TTF (Satori-compatible) instead of WOFF2
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@${weight}&display=swap`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1' } }
    ).then(r => r.text())
    const url = css.match(/src: url\((.+)\) format\('truetype'\)/)?.[1]
    if (!url) return null
    return fetch(url).then(r => r.arrayBuffer())
  } catch {
    return null
  }
}

export default async function OGImage() {
  const pixelFont = await loadFont('Press Start 2P', 400)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.95) 100%)',
        }} />

        {/* Corner brackets */}
        <div style={{ position: 'absolute', top: 36, left: 40, color: 'rgba(255,255,255,0.18)', fontSize: 22, fontFamily: 'monospace', display: 'flex' }}>┌──</div>
        <div style={{ position: 'absolute', top: 36, right: 40, color: 'rgba(255,255,255,0.18)', fontSize: 22, fontFamily: 'monospace', display: 'flex' }}>──┐</div>
        <div style={{ position: 'absolute', bottom: 36, left: 40, color: 'rgba(255,255,255,0.18)', fontSize: 22, fontFamily: 'monospace', display: 'flex' }}>└──</div>
        <div style={{ position: 'absolute', bottom: 36, right: 40, color: 'rgba(255,255,255,0.18)', fontSize: 22, fontFamily: 'monospace', display: 'flex' }}>──┘</div>

        {/* v0.0.1 label */}
        <div style={{
          position: 'absolute', top: 42, right: 52,
          color: 'rgba(255,255,255,0.1)', fontSize: 11,
          fontFamily: pixelFont ? 'PressStart' : 'monospace',
          letterSpacing: '0.1em', display: 'flex',
        }}>v0.0.1-alpha</div>

        {/* Top separator */}
        <div style={{ width: 900, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 52, display: 'flex' }} />

        {/* WEGBRAIT */}
        <div style={{
          color: '#fff',
          fontSize: 96,
          fontFamily: pixelFont ? 'PressStart' : 'monospace',
          letterSpacing: '0.08em',
          display: 'flex',
          textShadow: '0 0 40px rgba(255,255,255,0.2), 0 0 80px rgba(255,255,255,0.08)',
        }}>
          WEGBRAIT
        </div>

        {/* .COM — offset right to mirror page layout */}
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 48,
          fontFamily: pixelFont ? 'PressStart' : 'monospace',
          letterSpacing: '0.1em',
          marginTop: 24,
          alignSelf: 'flex-end',
          marginRight: 148,
          display: 'flex',
        }}>
          .COM
        </div>

        {/* Bottom separator */}
        <div style={{ width: 900, height: 1, background: 'rgba(255,255,255,0.08)', marginTop: 52, display: 'flex' }} />
      </div>
    ),
    {
      ...size,
      fonts: pixelFont
        ? [{ name: 'PressStart', data: pixelFont, style: 'normal', weight: 400 }]
        : [],
    }
  )
}
