import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'wegbrait.com — coming soon'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
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
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Corner brackets */}
        <div style={{ position: 'absolute', top: 32, left: 32, color: 'rgba(255,255,255,0.2)', fontSize: 20, display: 'flex' }}>┌──</div>
        <div style={{ position: 'absolute', top: 32, right: 32, color: 'rgba(255,255,255,0.2)', fontSize: 20, display: 'flex' }}>──┐</div>
        <div style={{ position: 'absolute', bottom: 32, left: 32, color: 'rgba(255,255,255,0.2)', fontSize: 20, display: 'flex' }}>└──</div>
        <div style={{ position: 'absolute', bottom: 32, right: 32, color: 'rgba(255,255,255,0.2)', fontSize: 20, display: 'flex' }}>──┘</div>

        {/* Top label */}
        <div style={{
          color: 'rgba(255,255,255,0.2)',
          fontSize: 13,
          letterSpacing: '0.5em',
          marginBottom: 32,
          display: 'flex',
        }}>
          ◆ &nbsp; W E G B R A I T . C O M &nbsp; ◆
        </div>

        {/* Top rule */}
        <div style={{ width: 700, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 40, display: 'flex' }} />

        {/* WEGBRAIT */}
        <div style={{
          color: '#ffffff',
          fontSize: 128,
          fontWeight: 900,
          letterSpacing: '0.12em',
          display: 'flex',
          textShadow: '0 0 40px rgba(255,255,255,0.25)',
        }}>
          WEGBRAIT
        </div>

        {/* .COM */}
        <div style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: '0.18em',
          marginTop: 8,
          display: 'flex',
        }}>
          .COM
        </div>

        {/* Bottom rule */}
        <div style={{ width: 700, height: 1, background: 'rgba(255,255,255,0.08)', marginTop: 40, display: 'flex' }} />

        {/* Version */}
        <div style={{
          position: 'absolute',
          bottom: 36,
          right: 48,
          color: 'rgba(255,255,255,0.08)',
          fontSize: 11,
          letterSpacing: '0.15em',
          display: 'flex',
        }}>
          v0.0.1-alpha
        </div>
      </div>
    ),
    { ...size }
  )
}
