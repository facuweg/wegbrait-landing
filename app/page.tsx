'use client'

import { useEffect, useState, useMemo } from 'react'

const WEGBRAIT = `██╗    ██╗███████╗ ██████╗ ██████╗ ██████╗  █████╗ ██╗████████╗
██║    ██║██╔════╝██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██║╚══██╔══╝
██║ █╗ ██║█████╗  ██║  ███╗██████╔╝██████╔╝███████║██║   ██║
██║███╗██║██╔══╝  ██║   ██║██╔══██╗██╔══██╗██╔══██║██║   ██║
╚███╔███╔╝███████╗╚██████╔╝██████╔╝██║  ██║██║  ██║██║   ██║
 ╚══╝╚══╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝  `

const DOT_COM = `     ██████╗  ██████╗ ███╗   ███╗
    ██╔════╝ ██╔═══██╗████╗ ████║
    ██║      ██║   ██║██╔████╔██║
    ██║      ██║   ██║██║╚██╔╝██║
██╗ ╚██████╗ ╚██████╔╝██║ ╚═╝ ██║
╚═╝  ╚═════╝  ╚═════╝╚═╝     ╚═╝`

// Character grid constants — tuned for Courier New at 10px
const CHAR_W = 6     // px per character column
const LINE_H = 12    // px per character row

const BG_CHARS = ['+', '·', '×', '○', '◦', '│', '─', '┼', '▪', '∙', '◌', '»']

interface AsciiChar {
  id: string
  char: string
  // Absolute pixel position in the resting grid
  baseX: number
  baseY: number
  // Normalized explosion direction from grid center
  dirX: number
  dirY: number
  // Raw distance from center (for boosting peripheral chars)
  dist: number
  isDotCom: boolean
}

function buildGrid(wegbrait: string, dotCom: string): { chars: AsciiChar[], gridW: number, gridH: number } {
  const wegLines = wegbrait.split('\n')
  const comLines = dotCom.split('\n')
  const wegColCount = Math.max(...wegLines.map(l => [...l].length))
  const comColCount = Math.max(...comLines.map(l => [...l].length))
  // Right-align .COM under WEGBRAIT
  const comColOffset = Math.max(0, wegColCount - comColCount)
  const comRowOffset = wegLines.length + 1  // +1 for gap row
  const gridRows = comRowOffset + comLines.length
  const centerCol = wegColCount / 2
  const centerRow = gridRows / 2
  const chars: AsciiChar[] = []

  const collect = (lines: string[], rowOff: number, colOff: number, isDotCom: boolean) => {
    lines.forEach((line, r) => {
      ;[...line].forEach((ch, c) => {
        if (ch.trim() === '') return
        const col = c + colOff
        const row = r + rowOff
        const dx = col - centerCol
        const dy = row - centerRow
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        chars.push({
          id: `${row}-${col}`,
          char: ch,
          baseX: col * CHAR_W,
          baseY: row * LINE_H,
          dirX: dx / dist,
          dirY: dy / dist,
          dist,
          isDotCom,
        })
      })
    })
  }

  collect(wegLines, 0, 0, false)
  collect(comLines, comRowOffset, comColOffset, true)
  return { chars, gridW: wegColCount * CHAR_W, gridH: gridRows * LINE_H }
}

const CORNERS = [
  { style: { top: 24, left: 24 } as React.CSSProperties, label: '┌──' },
  { style: { top: 24, right: 24 } as React.CSSProperties, label: '──┐' },
  { style: { bottom: 24, left: 24 } as React.CSSProperties, label: '└──' },
  { style: { bottom: 24, right: 24 } as React.CSSProperties, label: '──┘' },
]

export default function Page() {
  const [scrollY, setScrollY] = useState(0)
  const [glitch, setGlitch] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState({ a: 4, b: -3 })
  const [cursor, setCursor] = useState(true)

  const { chars, gridW, gridH } = useMemo(() => buildGrid(WEGBRAIT, DOT_COM), [])

  const particles = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: ((i * 1973 + 137) % 997) / 997 * 100,
      startY: ((i * 2311 + 89) % 991) / 991 * 100,
      char: BG_CHARS[i % BG_CHARS.length],
      duration: 22 + (i % 18),
      delay: -((i * 4.3) % 22),
      opacity: 0.018 + (i % 5) * 0.008,
      size: 8 + (i % 6),
    })), [])

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const schedule = () => {
      t = setTimeout(() => {
        setGlitchOffset({ a: Math.random() > 0.5 ? 6 : -6, b: Math.random() > 0.5 ? -4 : 4 })
        setGlitch(true)
        setTimeout(() => { setGlitch(false); schedule() }, 70 + Math.random() * 110)
      }, 3000 + Math.random() * 5000)
    }
    schedule()
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  // Single progress 0→1 over first 2500px of scroll
  const progress = Math.min(scrollY / 2500, 1)
  // Cubic ease-in: slow start, then violent burst
  const phase2 = progress * progress * progress

  // Subtle tilt that peaks early then yields to the explosion
  const tilt = progress * (1 - progress) * 4  // rises then falls back to 0
  const rotateX = tilt * 8
  const rotateY = Math.sin(progress * Math.PI) * tilt * 6
  const rotateZ = tilt * 2
  // Container rushes toward viewer as explosion progresses
  const translateZ = phase2 * 350

  const decorOpacity = Math.max(1 - progress * 8, 0)  // decorations vanish fast
  const containerOpacity = phase2 > 0.98 ? 0 : 1

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: #000; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 3px; background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); }
        @keyframes drift {
          0%   { transform: translateY(0);     opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: brightness(1)    drop-shadow(0 0 5px  rgba(255,255,255,0.12)); }
          50%       { filter: brightness(1.04) drop-shadow(0 0 14px rgba(255,255,255,0.26)); }
        }
        @keyframes sweep {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 1; } 95% { opacity: 1; }
          100% { top: 100vh; opacity: 0; }
        }
        @keyframes flicker {
          0%, 91%, 94%, 99%, 100% { opacity: 1; }
          92%, 95% { opacity: 0.35; }
        }
      `}</style>

      {/* Scroll driver — 600vh gives room for both phases */}
      <div style={{ height: '600vh', background: '#000' }} />

      {/* Fixed viewport */}
      <div style={{
        position: 'fixed', inset: 0, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', perspective: '900px', perspectiveOrigin: '50% 50%',
      }}>

        {/* Fine grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
        }} />

        {/* Drifting background chars */}
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.startY}%`,
            fontSize: p.size, color: `rgba(255,255,255,${p.opacity})`,
            fontFamily: 'monospace', lineHeight: 1, pointerEvents: 'none',
            animation: `drift ${p.duration}s ${p.delay}s linear infinite`, zIndex: 1,
          }}>{p.char}</div>
        ))}

        {/* Sweep line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 50%, transparent)',
          pointerEvents: 'none', animation: 'sweep 12s linear infinite', zIndex: 4,
        }} />

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
          background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.9) 100%)',
        }} />

        {/* Scanlines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
        }} />

        {/* ── 3D Content ── */}
        <div style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translateZ(${translateZ}px)`,
          transformStyle: 'preserve-3d',
          opacity: containerOpacity,
          userSelect: 'none',
          position: 'relative',
          zIndex: 10,
          animation: (glitch || phase2 > 0) ? 'none' : 'float 7s ease-in-out infinite',
        }}>

          {/* Decorations — fade out when explosion starts */}
          <div style={{ opacity: decorOpacity, transition: 'opacity 0.1s' }}>
            <div style={{
              fontFamily: 'monospace', fontSize: 'clamp(6px, 0.7vw, 9px)',
              color: 'rgba(255,255,255,0.18)', letterSpacing: '0.5em',
              textAlign: 'center', marginBottom: '0.9rem',
            }}>
              ◆ &nbsp; W E G B R A I T . C O M &nbsp; ◆
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '0.5rem' }} />
          </div>

          {/* ── ASCII explosion grid ── */}
          <div style={{
            position: 'relative',
            width: gridW,
            height: gridH,
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '10px',
            lineHeight: `${LINE_H}px`,
            animation: (glitch || phase2 > 0) ? 'none' : 'pulse-glow 5s ease-in-out infinite',
          }}>
            {chars.map(({ id, char, baseX, baseY, dirX, dirY, dist, isDotCom }) => {
              // Peripheral characters get a distance boost — outer chars fly farther
              const boost = 1 + dist * 0.18
              const expX = dirX * phase2 * 680 * boost
              const expY = dirY * phase2 * 420 * boost
              // Characters fly toward the viewer (Z+), with outer chars leading
              const expZ = phase2 * (380 + dist * 14)

              const glitchDX = glitch ? (isDotCom ? glitchOffset.b : glitchOffset.a) : 0
              const charOpacity = isDotCom ? (0.6 - phase2 * 0.15) : (1 - phase2 * 0.1)

              return (
                <span key={id} style={{
                  position: 'absolute',
                  left: baseX + expX + glitchDX,
                  top: baseY + expY,
                  transform: `translateZ(${expZ}px)`,
                  color: `rgba(255,255,255,${charOpacity})`,
                  display: 'inline-block',
                  willChange: 'transform',
                  textShadow: phase2 > 0.05
                    ? `0 0 ${8 + phase2 * 20}px rgba(255,255,255,${0.3 + phase2 * 0.5})`
                    : 'none',
                }}>
                  {char}
                </span>
              )
            })}
          </div>

          {/* Decorations — fade out when explosion starts */}
          <div style={{ opacity: decorOpacity, transition: 'opacity 0.1s' }}>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginTop: '0.5rem' }} />
            <div style={{
              fontFamily: 'monospace', fontSize: 'clamp(5px, 0.6vw, 7px)',
              color: 'rgba(255,255,255,0.1)', letterSpacing: '0.5em',
              textAlign: 'center', marginTop: '0.5rem',
              opacity: Math.max(0, 1 - progress * 8),
            }}>
              [ SCROLL TO EXPLORE ]
            </div>
          </div>
        </div>

        {/* Corner brackets */}
        {CORNERS.map(({ style, label }, i) => (
          <div key={i} style={{
            position: 'absolute', ...style, fontFamily: 'monospace',
            fontSize: '0.75rem', color: 'rgba(255,255,255,0.1)',
            lineHeight: 1, letterSpacing: '0.05em', zIndex: 20,
          }}>{label}</div>
        ))}

        {/* Coordinate readout */}
        <div style={{
          position: 'absolute', bottom: 24, left: 24, fontFamily: 'monospace',
          fontSize: '7px', color: 'rgba(255,255,255,0.1)', letterSpacing: '0.15em', zIndex: 20,
        }}>
          {`RX:${rotateX.toFixed(1)} RY:${rotateY.toFixed(1)} Z:${translateZ.toFixed(0)} EXP:${(progress * 100).toFixed(0)}%`}
        </div>

        <div style={{
          position: 'absolute', top: 24, right: 24, fontFamily: 'monospace',
          fontSize: '7px', color: 'rgba(255,255,255,0.08)', letterSpacing: '0.15em',
          zIndex: 20, textAlign: 'right',
        }}>
          WEGBRAIT.COM<br />v0.0.1-alpha
        </div>
      </div>
    </>
  )
}
