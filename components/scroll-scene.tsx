'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCROLL_HEIGHT_VH = 900
const CORE = new THREE.Vector3(0, 5, -70)
const TERRAIN_Y = -7
const TEXT_WIDTH = 21

/* ------------------------------------------------------------------ */
/*  GLSL helpers                                                       */
/* ------------------------------------------------------------------ */

const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

/* ------------------------------------------------------------------ */
/*  Particles: text  ->  dust tunnel  ->  halo                         */
/* ------------------------------------------------------------------ */

const PARTICLE_VERT = /* glsl */ `
${SNOISE}
uniform float uTime;
uniform float uMorphA;      // text -> scatter
uniform float uMorphB;      // scatter -> halo
uniform float uSize;
uniform float uTextScale;
uniform mat3 uHaloMat;
uniform float uHaloAlpha;
uniform float uHaloSize;
uniform float uMaxSize;
uniform float uHaloScale;
attribute vec3 aText;
attribute vec3 aScatter;
attribute vec3 aHalo;
attribute float aRand;
varying float vAlpha;
varying float vRand;

void main() {
  vRand = aRand;
  // Staggered morph so letters peel off instead of popping.
  // Letters peel off left to right, with a little per-particle jitter.
  float letterDelay = clamp(aText.x / 21.0 + 0.5, 0.0, 1.0);
  float mA = smoothstep(0.0, 1.0, (uMorphA * 1.9 - letterDelay * 0.7 - aRand * 0.2));
  float mB = smoothstep(0.0, 1.0, (uMorphB * 1.5 - aRand * 0.5));

  vec3 textPos = aText * vec3(uTextScale, uTextScale, 1.0);
  vec3 p = mix(textPos, aScatter, mA);

  // Halo: aHalo = (radius, angle, height jitter). Spin around the disc normal.
  float th = aHalo.y + uTime * (0.10 + 0.08 * fract(aRand * 7.0));
  vec3 haloLocal = vec3(cos(th) * aHalo.x, aHalo.z, sin(th) * aHalo.x) * uHaloScale;
  vec3 haloPos = uHaloMat * haloLocal + vec3(0.0, 5.0, -70.0);
  p = mix(p, haloPos, mB);

  // Flow field: tiny shimmer in text state, wide drift in the tunnel,
  // a slow orbital swirl in the halo.
  float flowAmp = mix(0.06, 1.4, mA) * (1.0 - mB * 0.97);
  vec3 q = p * 0.12 + vec3(0.0, uTime * 0.05, uTime * 0.03);
  vec3 flow = vec3(
    snoise(q),
    snoise(q + vec3(31.7, 0.0, 0.0)),
    snoise(q + vec3(0.0, 0.0, 71.3))
  );
  p += flow * flowAmp;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  float size = uSize * (0.6 + aRand * 0.8) * (26.0 / max(dist, 1.0));
  size *= mix(1.0, 1.25, mA);
  // Halo points keep a screen-constant size regardless of camera distance.
  float haloSize = uSize * (0.6 + aRand * 0.8) * uHaloSize * 0.9;
  size = mix(size, haloSize, mB);
  gl_PointSize = clamp(size, 1.0, uMaxSize);
  gl_Position = projectionMatrix * mv;

  float fog = smoothstep(90.0, 4.0, dist);
  fog *= mix(1.0, 0.35 + 0.65 * smoothstep(60.0, 8.0, dist), mA);
  fog = mix(fog, 1.0, mB);
  float base = mix(0.42, 0.55, mA);
  base = mix(base, uHaloAlpha, mB);
  // Dim while the dust is in transit to the halo so it never blankets the frame.
  base *= 1.0 - 0.55 * sin(mB * 3.14159);
  vAlpha = base * fog * (0.5 + 0.5 * aRand);
}
`

const PARTICLE_FRAG = /* glsl */ `
varying float vAlpha;
varying float vRand;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float soft = smoothstep(0.25, 0.10, d);
  float core = smoothstep(0.06, 0.0, d);
  float a = (soft * 0.7 + core * 0.6) * vAlpha;
  gl_FragColor = vec4(vec3(1.0), a);
}
`

/* ------------------------------------------------------------------ */
/*  Terrain: wireframe noise landscape                                 */
/* ------------------------------------------------------------------ */

const TERRAIN_VERT = /* glsl */ `
${SNOISE}
uniform float uTime;
uniform float uAmp;
uniform float uScroll;
varying float vFade;
varying float vHeight;

float height(vec2 xz) {
  vec2 s = xz + vec2(0.0, uScroll);
  float h = snoise(vec3(s * 0.045, uTime * 0.04)) * 1.0;
  h += snoise(vec3(s * 0.12, uTime * 0.06 + 10.0)) * 0.35;
  h += snoise(vec3(s * 0.3, 20.0)) * 0.08;
  // A valley along the flight path so the camera never clips the ground.
  float valley = smoothstep(0.0, 26.0, abs(xz.x));
  return h * (0.35 + 0.65 * valley) * 7.0;
}

void main() {
  vec3 p = position;
  float h = height(p.xz);
  p.y += h * uAmp;
  vHeight = h;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  float fog = smoothstep(140.0, 10.0, dist) * smoothstep(4.0, 28.0, dist);
  float edge = smoothstep(120.0, 60.0, abs(position.x)) * smoothstep(120.0, 70.0, abs(position.z));
  vFade = fog * edge;
  gl_Position = projectionMatrix * mv;
}
`

const TERRAIN_FRAG = /* glsl */ `
uniform float uOpacity;
varying float vFade;
varying float vHeight;
void main() {
  float bright = 0.35 + 0.65 * smoothstep(-4.0, 6.0, vHeight);
  gl_FragColor = vec4(vec3(bright), vFade * uOpacity);
}
`

/* ------------------------------------------------------------------ */
/*  Post: luminance + Bayer dither + grain + vignette                   */
/* ------------------------------------------------------------------ */

const MonoShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uDither: { value: 0.55 },
    uGrain: { value: 0.07 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uDither;
    uniform float uGrain;
    varying vec2 vUv;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    float bayer8(vec2 p) {
      ivec2 c = ivec2(mod(p, 8.0));
      int x = c.x, y = c.y;
      // Recursive Bayer construction
      int v = 0;
      for (int i = 0; i < 3; i++) {
        int xb = (x >> i) & 1;
        int yb = (y >> i) & 1;
        v = (v << 2) | ((xb ^ yb) << 1) | yb;
      }
      return (float(v) + 0.5) / 64.0;
    }

    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      // Slight tone curve to keep blacks black.
      l = pow(max(l, 0.0), 1.15);
      // Film grain
      float g = hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5;
      l += g * uGrain * (0.05 + l);
      l = max(l - 0.012, 0.0);
      // Ordered dither to a few levels, blended with the smooth value.
      // Fully white pixels (wireframe lines) are left untouched.
      float levels = 6.0;
      float t = bayer8(gl_FragCoord.xy);
      float q = floor(l * levels + t) / levels;
      float gate = smoothstep(0.02, 0.09, l) * (1.0 - smoothstep(0.85, 1.0, l));
      float o = mix(l, q, uDither * gate);
      // Vignette (after quantisation so it never breaks lines into dashes)
      vec2 d = vUv - 0.5;
      o *= 1.0 - dot(d, d) * 0.9;
      // Scanlines
      o *= 1.0 - 0.035 * step(0.5, fract(gl_FragCoord.y * 0.5));
      gl_FragColor = vec4(vec3(clamp(o, 0.0, 1.0)), 1.0);
    }
  `,
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mulberry = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function sampleText(text: string, count: number, rand: () => number): Float32Array {
  const W = 1600
  const H = 400
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 210px ${GeistSans.style.fontFamily}, "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.fillText(text, W / 2, H / 2 + 8)
  const data = ctx.getImageData(0, 0, W, H).data

  const pts: number[] = []
  let minX = W, maxX = 0, minY = H, maxY = 0
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (data[(y * W + x) * 4] > 128) {
        pts.push(x, y)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const textW = Math.max(1, maxX - minX)
  const scale = TEXT_WIDTH / textW
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const out = new Float32Array(count * 3)
  const n = pts.length / 2
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * n)
    const px = pts[k * 2] + (rand() - 0.5) * 2.2
    const py = pts[k * 2 + 1] + (rand() - 0.5) * 2.2
    out[i * 3] = (px - cx) * scale
    out[i * 3 + 1] = -(py - cy) * scale
    out[i * 3 + 2] = (rand() - 0.5) * 0.6
  }
  return out
}

function buildTerrain(size: number, segments: number): THREE.BufferGeometry {
  const half = size / 2
  const step = size / segments
  const verts: number[] = []
  for (let i = 0; i <= segments; i++) {
    const a = -half + i * step
    for (let j = 0; j < segments; j++) {
      const b0 = -half + j * step
      const b1 = b0 + step
      // Row (constant z)
      verts.push(b0, 0, a, b1, 0, a)
      // Column (constant x)
      verts.push(a, 0, b0, a, 0, b1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  return geo
}

/* ------------------------------------------------------------------ */
/*  Overlay copy                                                       */
/* ------------------------------------------------------------------ */

type Chapter = { id: string; start: number; end: number; kicker?: string; title: string; body?: string }

const CHAPTERS: Chapter[] = [
  { id: 'c1', start: 0.2, end: 0.4, kicker: '01 / SIGNAL', title: 'Every conversation leaves a trace.', body: 'Names, places, intentions. Scattered across a thousand moments.' },
  { id: 'c2', start: 0.42, end: 0.58, kicker: '02 / TERRAIN', title: 'Patterns emerge from the noise.', body: 'What looked like dust becomes a landscape you can read.' },
  { id: 'c3', start: 0.63, end: 0.88, kicker: '03 / CORE', title: 'One place to remember them all.', body: 'Your network, held together at the centre.' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ScrollScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    } catch {
      mount.dataset.fallback = '1'
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent)
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)

    renderer.setPixelRatio(dpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 1)
    renderer.toneMapping = THREE.NoToneMapping
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 400)
    camera.position.set(0, 0, 30)

    const rand = mulberry(1337)

    /* ---- Particles ---- */
    const COUNT = isMobile ? 14000 : 32000
    const textPos = sampleText('WEGBRAIT', COUNT, rand)
    const scatter = new Float32Array(COUNT * 3)
    const halo = new Float32Array(COUNT * 3)
    const rands = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      // Scatter: a long dust tunnel from z=+34 to z=-90 around the flight path.
      const ang = rand() * Math.PI * 2
      const r = 1.2 + Math.pow(rand(), 1.6) * 22
      const z = 34 - rand() * 130
      scatter[i * 3] = Math.cos(ang) * r
      scatter[i * 3 + 1] = Math.sin(ang) * r * 0.7 + 1
      scatter[i * 3 + 2] = z
      // Halo: (radius, angle, height jitter) of a disc / iris around the core,
      // dense at the inner rim and thinning outward.
      const ring = rand()
      halo[i * 3] = 7.4 + Math.pow(ring, 0.6) * 2.4 + (rand() - 0.5) * 0.3
      halo[i * 3 + 1] = rand() * Math.PI * 2
      halo[i * 3 + 2] = (rand() - 0.5) * 0.5
      rands[i] = rand()
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(textPos, 3))
    pGeo.setAttribute('aText', new THREE.BufferAttribute(textPos, 3))
    pGeo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    pGeo.setAttribute('aHalo', new THREE.BufferAttribute(halo, 3))
    pGeo.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -30), 200)
    const pMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uMorphA: { value: 0 },
        uMorphB: { value: 0 },
        uSize: { value: (isMobile ? 1.8 : 2.1) * dpr },
        uTextScale: { value: 1 },
        uHaloAlpha: { value: isMobile ? 0.17 : 0.42 },
        uHaloSize: { value: isMobile ? 1.3 : 1.1 },
        uMaxSize: { value: 4.5 * dpr },
        uHaloScale: { value: 1 },
        uHaloMat: { value: new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI * 0.44)) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(pGeo, pMat)
    points.frustumCulled = false
    scene.add(points)

    // Re-sample the wordmark once the real font is available (the first
    // pass may have used a fallback face if fonts were still loading).
    let disposed = false
    const fontSpec = `800 210px ${GeistSans.style.fontFamily}`
    const fontsReady = document.fonts?.load ? document.fonts.load(fontSpec).then(() => document.fonts.ready) : Promise.resolve()
    fontsReady.then(() => {
      if (disposed) return
      const fresh = sampleText('WEGBRAIT', COUNT, mulberry(1337))
      ;(pGeo.getAttribute('aText') as THREE.BufferAttribute).array.set(fresh)
      ;(pGeo.getAttribute('aText') as THREE.BufferAttribute).needsUpdate = true
    }).catch(() => {})

    /* ---- Terrain ---- */
    const tGeo = buildTerrain(240, isMobile ? 70 : 110)
    const tMat = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT,
      fragmentShader: TERRAIN_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0 },
        uScroll: { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    })
    const terrain = new THREE.LineSegments(tGeo, tMat)
    terrain.position.set(240 / (isMobile ? 70 : 110) / 2, TERRAIN_Y, -40)
    terrain.rotation.y = 0.035
    terrain.frustumCulled = false
    scene.add(terrain)

    /* ---- Monolith ---- */
    const mono = new THREE.Group()
    mono.position.copy(CORE)
    const icoGeo = new THREE.IcosahedronGeometry(6.5, 1)
    const icoFill = new THREE.Mesh(icoGeo, new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }))
    const icoEdgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    const icoEdgeGeo = new THREE.EdgesGeometry(icoGeo, 1)
    const icoEdges = new THREE.LineSegments(icoEdgeGeo, icoEdgeMat)
    // Hidden edges drawn intentionally dashed, behind the solid ones.
    const icoBackMat = new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0, dashSize: 0.45, gapSize: 0.35, depthTest: false })
    const icoBack = new THREE.LineSegments(icoEdgeGeo, icoBackMat)
    icoBack.computeLineDistances()
    icoBack.renderOrder = -1
    const innerGeo = new THREE.IcosahedronGeometry(3.2, 0)
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    const inner = new THREE.Mesh(innerGeo, innerMat)
    const innerEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.25, 0)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    )
    mono.add(icoBack, icoFill, icoEdges, inner, innerEdges)

    const rings: THREE.Line[] = []
    const ringMats: THREE.LineBasicMaterial[] = []
    const ringSpecs = [
      { r: 9.2, tilt: [0.9, 0.2, 0] },
      { r: 11.2, tilt: [-0.5, 1.1, 0.3] },
      { r: 13.6, tilt: [0.3, -0.7, 1.2] },
    ]
    for (const spec of ringSpecs) {
      const pts: THREE.Vector3[] = []
      const seg = 160
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2
        pts.push(new THREE.Vector3(Math.cos(a) * spec.r, 0, Math.sin(a) * spec.r))
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts)
      const ringMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      ringMats.push(ringMat)
      const line = new THREE.Line(g, ringMat)
      line.rotation.set(spec.tilt[0], spec.tilt[1], spec.tilt[2])
      rings.push(line)
      mono.add(line)
    }
    scene.add(mono)

    /* ---- Post-processing ---- */
    const composer = new EffectComposer(renderer)
    composer.setPixelRatio(dpr)
    composer.setSize(window.innerWidth, window.innerHeight)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      isMobile ? 0.55 : 0.7,
      0.5,
      0.32,
    )
    composer.addPass(bloom)
    const monoPass = new ShaderPass(MonoShader)
    composer.addPass(monoPass)

    /* ---- State ---- */
    let targetProgress = 0
    let progress = 0
    let mouseX = 0
    let mouseY = 0
    let mx = 0
    let my = 0
    let raf = 0
    let last = performance.now()
    let elapsed = 0
    const camPos = new THREE.Vector3()
    const camLook = new THREE.Vector3()
    const lookSmooth = new THREE.Vector3(0, 0, 0)
    const viewDir = new THREE.Vector3()
    const ringNormal = new THREE.Vector3()

    const orbitScale = isMobile ? 2.1 : 1
    const readScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      targetProgress = Math.min(1, Math.max(0, window.scrollY / max))
    }
    const onMouse = (e: PointerEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      composer.setSize(w, h)
      bloom.setSize(w, h)
      const visW = 2 * 30 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect
      pMat.uniforms.uTextScale.value = Math.min(1, (visW * (isMobile ? 0.78 : 0.86)) / TEXT_WIDTH)
      // Closing halo must fit inside the short axis of the viewport.
      const finalDist = 30 * orbitScale
      const pxPerUnit = (h / 2) / (finalDist * Math.tan((camera.fov * Math.PI) / 360))
      const haloMaxUnits = 9.8
      pMat.uniforms.uHaloScale.value = Math.min(1.05, Math.max(0.6, (0.4 * Math.min(w, h)) / (haloMaxUnits * pxPerUnit)))
      readScroll()
    }

    const cameraAt = (p: number, pos: THREE.Vector3, look: THREE.Vector3) => {
      if (p < 0.4) {
        const push = smooth(0.15, 0.4, p)
        const pushE = push * push
        pos.set(0, -0.5 * pushE, 30 - 24 * pushE)
        const lk = smooth(0.2, 0.4, p)
        look.set(0, lerp(0, 3, lk), lerp(0, -70, lk))
      } else if (p < 0.62) {
        const t = (p - 0.4) / 0.22
        const e = t * t * (3 - 2 * t)
        pos.set(Math.sin(t * Math.PI) * 4, 1.5 + 2.5 * e, 6 - (46 + 6 * (orbitScale - 1) * 5) * e)
        look.copy(CORE)
      } else {
        const t = smooth(0.62, 0.96, p)
        const ang = t * Math.PI * 2
        const R = (30 - 8 * Math.sin(t * Math.PI)) * orbitScale
        pos.set(CORE.x + Math.sin(ang) * R, 4 + 4 * Math.sin(t * Math.PI), CORE.z + Math.cos(ang) * R)
        look.copy(CORE)
      }
    }

    const chapterVis = (id: string, p: number) => {
      const ch = CHAPTERS.find(c => c.id === id)!
      return smooth(ch.start, ch.start + 0.06, p) * (1 - smooth(ch.end - 0.06, ch.end, p))
    }

    const setOpacity = (el: HTMLElement | null, v: number, y = 0) => {
      if (!el) return
      el.style.opacity = v.toFixed(3)
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
      el.style.visibility = v <= 0.001 ? 'hidden' : 'visible'
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      elapsed += reducedMotion ? dt * 0.25 : dt

      // Smoothed scroll + mouse
      const k = 1 - Math.pow(0.0005, dt)
      progress += (targetProgress - progress) * k
      mx += (mouseX - mx) * (1 - Math.pow(0.001, dt))
      my += (mouseY - my) * (1 - Math.pow(0.001, dt))
      const p = progress

      // Camera
      cameraAt(p, camPos, camLook)
      const parallax = isMobile ? 0 : 0.8
      camPos.x += mx * parallax
      camPos.y += -my * parallax * 0.6
      camera.position.copy(camPos)
      lookSmooth.lerp(camLook, k)
      camera.lookAt(lookSmooth)
      // While chapter copy is on screen, nudge the subject away from it.
      const copyVis = Math.max(chapterVis('c2', p), chapterVis('c3', p))
      if (isMobile) camera.rotateX(-0.11 * copyVis)
      else camera.rotateY(0.2 * copyVis)
      camera.rotation.z += Math.sin(elapsed * 0.3) * 0.004

      // Particles
      pMat.uniforms.uTime.value = elapsed
      pMat.uniforms.uMorphA.value = smooth(0.14, 0.4, p)
      pMat.uniforms.uMorphB.value = smooth(0.8, 0.97, p)

      // Terrain
      const terrainIn = smooth(0.2, 0.44, p)
      const terrainOut = 1 - smooth(0.86, 0.98, p)
      tMat.uniforms.uTime.value = elapsed
      tMat.uniforms.uAmp.value = terrainIn
      tMat.uniforms.uOpacity.value = terrainIn * terrainOut * 0.75
      tMat.uniforms.uScroll.value = -p * 40 + elapsed * 0.6

      // Monolith
      const monoIn = smooth(0.34, 0.6, p)
      const coreIn = smooth(0.62, 0.78, p)
      icoEdgeMat.opacity = monoIn * 0.9
      icoBackMat.opacity = monoIn * 0.3
      innerMat.opacity = coreIn * (0.55 + 0.25 * Math.sin(elapsed * 2.1))
      ;(innerEdges.material as THREE.LineBasicMaterial).opacity = coreIn
      const ringBase = monoIn * (0.55 + 0.4 * coreIn)
      mono.rotation.y = elapsed * 0.12
      mono.rotation.x = Math.sin(elapsed * 0.17) * 0.15
      inner.rotation.y = -elapsed * 0.5
      inner.rotation.x = elapsed * 0.31
      innerEdges.rotation.copy(inner.rotation)
      viewDir.subVectors(CORE, camera.position).normalize()
      rings.forEach((r, i) => {
        r.rotation.z += dt * (0.08 + i * 0.05) * (i % 2 ? -1 : 1)
        r.rotation.x += dt * 0.03
        r.updateMatrixWorld()
        ringNormal.set(0, 1, 0).transformDirection(r.matrixWorld)
        const facing = Math.abs(ringNormal.dot(viewDir))
        ringMats[i].opacity = ringBase * smooth(0.06, 0.3, facing)
      })

      // Post
      monoPass.uniforms.uTime.value = elapsed
      monoPass.uniforms.uDither.value = 0.45 + 0.25 * smooth(0.62, 0.95, p)
      bloom.strength = (isMobile ? 0.55 : 0.7) + 0.35 * smooth(0.86, 1, p)

      // Overlay
      setOpacity(heroRef.current, 1 - smooth(0.1, 0.17, p), -smooth(0.08, 0.17, p) * 30)
      for (const ch of CHAPTERS) {
        const el = chapterRefs.current[ch.id]
        const fadeIn = smooth(ch.start, ch.start + 0.06, p)
        const fadeOut = 1 - smooth(ch.end - 0.06, ch.end, p)
        const v = fadeIn * fadeOut
        setOpacity(el, v, (1 - fadeIn) * 24 - (1 - fadeOut) * 24)
      }
      setOpacity(finalRef.current, smooth(0.9, 0.98, p), (1 - smooth(0.9, 0.98, p)) * 20)
      if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`
      if (readoutRef.current) {
        readoutRef.current.textContent = `X:${camPos.x.toFixed(1)} Y:${camPos.y.toFixed(1)} Z:${camPos.z.toFixed(1)}  T:${(p * 100).toFixed(0).padStart(3, '0')}%`
      }

      composer.render()
    }

    onResize()
    readScroll()
    window.addEventListener('scroll', readScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMouse, { passive: true })
    raf = requestAnimationFrame(frame)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', readScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMouse)
      composer.dispose()
      pGeo.dispose()
      pMat.dispose()
      tGeo.dispose()
      tMat.dispose()
      icoGeo.dispose()
      icoEdgeGeo.dispose()
      innerGeo.dispose()
      rings.forEach(r => r.geometry.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <>
      {/* Scroll driver */}
      <div style={{ height: `${SCROLL_HEIGHT_VH}vh` }} aria-hidden="true" />

      {/* Fixed stage */}
      <div className="ws-stage" style={{ fontFamily: GeistSans.style.fontFamily, ['--ws-mono' as string]: GeistMono.style.fontFamily } as React.CSSProperties}>
        <div ref={mountRef} className="ws-canvas" />

        {/* Hero copy */}
        <div ref={heroRef} className="ws-hero">
          <div className="ws-label"><span className="ws-dia">◆</span> &nbsp; W E G B R A I T . C O M &nbsp; <span className="ws-dia">◆</span></div>
          <div className="ws-hint">[ SCROLL ]</div>
        </div>

        {/* Chapters */}
        {CHAPTERS.map((ch) => (
          <div
            key={ch.id}
            ref={(el) => { chapterRefs.current[ch.id] = el }}
            className="ws-chapter"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            {ch.kicker && <div className="ws-kicker">{ch.kicker}</div>}
            <h2 className="ws-title">{ch.title}</h2>
            {ch.body && <p className="ws-body">{ch.body}</p>}
          </div>
        ))}

        {/* Final frame */}
        <div ref={finalRef} className="ws-final" style={{ opacity: 0, visibility: 'hidden' }}>
          <h1 className="ws-wordmark">wegbrait<span>.com</span></h1>
          <div className="ws-hint">[ END OF TRANSMISSION ]</div>
        </div>

        {/* HUD */}
        <div className="ws-corner ws-tl">┌──</div>
        <div className="ws-corner ws-tr">──┐</div>
        <div className="ws-corner ws-bl">└──</div>
        <div className="ws-corner ws-br">──┘</div>
        <div className="ws-version">WEGBRAIT.COM<br />v0.1.0-alpha</div>
        <div ref={readoutRef} className="ws-readout">X:0.0 Y:0.0 Z:30.0  T:000%</div>
        <div className="ws-bar"><div ref={barRef} className="ws-bar-fill" /></div>
      </div>

      <style>{`
        html, body { margin: 0; padding: 0; background: #000; color: #fff; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 3px; background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }
        ::selection { background: #fff; color: #000; }

        .ws-stage {
          position: fixed; inset: 0; background: #000; overflow: hidden;
          color: #fff;
        }
        .ws-canvas { position: absolute; inset: 0; }
        .ws-canvas canvas { display: block; width: 100%; height: 100%; }
        .ws-canvas[data-fallback="1"]::after {
          content: 'WEGBRAIT'; position: absolute; inset: 0; display: grid; place-items: center;
          font-weight: 800; font-size: clamp(40px, 12vw, 180px); letter-spacing: -0.04em;
        }

        .ws-hero {
          position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);
          padding-top: clamp(96px, 20vh, 200px);
          text-align: center; pointer-events: none;
        }
        .ws-label {
          font-family: var(--ws-mono, ui-monospace, monospace);
          font-size: clamp(7px, 0.8vw, 10px); letter-spacing: 0.5em;
          color: rgba(255,255,255,0.5);
        }
        .ws-hint {
          margin-top: 14px;
          font-family: var(--ws-mono, ui-monospace, monospace);
          font-size: clamp(7px, 0.7vw, 9px); letter-spacing: 0.4em;
          color: rgba(255,255,255,0.6);
          animation: ws-blink 2.4s ease-in-out infinite;
        }
        @keyframes ws-blink { 0%,100% { opacity: 0.55 } 50% { opacity: 1 } }

        .ws-chapter {
          position: absolute; left: clamp(24px, 8vw, 140px); top: 50%;
          max-width: min(520px, 80vw); transform: translateY(-50%);
          pointer-events: none; will-change: opacity, transform; z-index: 2;
        }
        .ws-chapter::before, .ws-final::before {
          content: ''; position: absolute; z-index: -1; pointer-events: none;
          inset: -90px -140px;
          background: radial-gradient(ellipse at 45% 50%, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.72) 42%, rgba(0,0,0,0) 72%);
        }
        .ws-final::before { inset: 30% 20%; background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 72%); }
        .ws-dia { font-size: 0.7em; vertical-align: 1px; }
        .ws-kicker {
          font-family: var(--ws-mono, ui-monospace, monospace);
          font-size: 10px; letter-spacing: 0.4em; color: rgba(255,255,255,0.45);
          margin-bottom: 18px;
        }
        .ws-title {
          margin: 0; font-weight: 600; letter-spacing: -0.03em; line-height: 1.02;
          font-size: clamp(30px, 5vw, 64px); color: #fff;
          text-shadow: 0 0 40px rgba(0,0,0,0.9);
        }
        .ws-body {
          margin: 18px 0 0; font-size: clamp(14px, 1.2vw, 17px); line-height: 1.5;
          color: rgba(255,255,255,0.78); max-width: 420px;
          text-shadow: 0 0 14px #000, 0 0 30px rgba(0,0,0,0.9);
        }

        .ws-final {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center; pointer-events: none; z-index: 2;
        }
        .ws-final .ws-hint { color: rgba(255,255,255,0.7); animation: none; text-shadow: 0 0 8px #000, 0 0 3px #000; }
        .ws-wordmark {
          margin: 0; font-weight: 800; letter-spacing: -0.05em; line-height: 0.95;
          font-size: clamp(44px, 9.5vw, 150px); color: #fff;
          text-shadow: 0 0 60px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,1);
        }
        .ws-wordmark span { color: rgba(255,255,255,0.5); }

        .ws-corner {
          position: absolute; font-family: var(--ws-mono, ui-monospace, monospace);
          font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1; letter-spacing: 0.05em;
          pointer-events: none; text-shadow: 0 0 6px #000, 0 0 2px #000;
        }
        .ws-tl { top: 22px; left: 22px } .ws-tr { top: 22px; right: 22px }
        .ws-bl { bottom: 22px; left: 22px } .ws-br { bottom: 22px; right: 22px }
        .ws-version {
          position: absolute; top: 40px; right: 22px; text-align: right;
          font-family: var(--ws-mono, ui-monospace, monospace);
          font-size: 10px; letter-spacing: 0.18em; color: rgba(255,255,255,0.6); pointer-events: none;
          text-shadow: 0 0 6px #000, 0 0 2px #000;
        }
        .ws-readout {
          position: absolute; bottom: 40px; left: 22px; white-space: pre;
          font-family: var(--ws-mono, ui-monospace, monospace);
          font-size: 10px; letter-spacing: 0.18em; color: rgba(255,255,255,0.6); pointer-events: none;
          text-shadow: 0 0 6px #000, 0 0 2px #000;
        }
        .ws-bar {
          position: absolute; left: 0; right: 0; bottom: 0; height: 2px; z-index: 5;
          background: rgba(255,255,255,0.1);
        }
        .ws-bar-fill {
          height: 100%; width: 100%; background: #fff; transform-origin: 0 50%;
          transform: scaleX(0);
        }

        @media (max-width: 767px) {
          .ws-chapter { left: 24px; right: 24px; max-width: none; top: auto; bottom: 9vh; transform: none; }
          .ws-chapter::before { inset: -70px -24px -12vh -24px; background: linear-gradient(to top, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0)); }
          .ws-version, .ws-readout { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ws-hint { animation: none; }
        }
      `}</style>
    </>
  )
}
