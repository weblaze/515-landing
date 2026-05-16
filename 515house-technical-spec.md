# 515 House — Full Technical Specification

## Stack & Tooling

- **Framework:** Vanilla JS + Vite (no framework overhead, full control over WebGL and scroll APIs)
- **Bundler:** Vite
- **Routing:** Single HTML entry point (`index.html`) + one additional route (`/projects`) rendered via `projects.html`. Client-side routing not needed — two static HTML files, Vite builds both.
- **Hosting:** Vercel or Netlify (static deploy, no server)
- **Scroll engine:** GSAP ScrollTrigger for all scroll-driven animations
- **WebGL:** OGL (lightweight WebGL library, ~12kb) for hero mesh distortion
- **Animation:** GSAP for all transitions, GSAP ScrollTrigger for scroll-driven effects
- **Content manifest:** Auto-generated at build time via Node.js script (`scripts/generate-manifest.js`)
- **Styling:** Plain CSS with CSS custom properties. No Tailwind, no CSS-in-JS.
- **Grain/noise overlay:** SVG feTurbulence filter applied as a fixed overlay across the entire site
- **Font:** To be decided by client. Spec assumes one display font (condensed bold, all-caps capable) and one body font (neutral, geometric sans). Load via `@font-face` from `/fonts/`.

---

## Project Structure

```
515house/
├── index.html
├── projects.html
├── vite.config.js
├── package.json
├── scripts/
│   └── generate-manifest.js       ← build-time content scanner
├── public/
│   └── fonts/
├── content/
│   ├── highlight/                 ← highlight project folders
│   │   └── [project-slug]/
│   │       ├── meta.json
│   │       └── assets/
│   └── projects/                  ← all projects folders
│       └── [project-slug]/
│           ├── meta.json
│           └── assets/
├── src/
│   ├── main.js                    ← index.html entry
│   ├── projects-page.js           ← projects.html entry
│   ├── manifest.js                ← auto-generated, do not edit manually
│   ├── style/
│   │   ├── base.css
│   │   ├── tokens.css
│   │   ├── grain.css
│   │   └── sections/
│   │       ├── hero.css
│   │       ├── highlight.css
│   │       ├── services.css
│   │       ├── perks.css
│   │       ├── about.css
│   │       ├── contact.css
│   │       ├── footer.css
│   │       └── projects-page.css
│   └── modules/
│       ├── cursor.js
│       ├── hero-webgl.js
│       ├── highlight-grid.js
│       ├── services-columns.js
│       ├── perks-stack.js
│       ├── about-split.js
│       ├── project-page.js
│       ├── contact.js
│       ├── footer.js
│       └── noise.js
```

---

## Content Folder & Filename Convention

### Folder Structure

Every project lives in its own folder under either `content/highlight/` or `content/projects/`.

```
content/
├── highlight/
│   └── ferrari-showreel/
│       ├── meta.json
│       └── assets/
│           ├── cover.jpg          ← required, used in asymmetric grid card
│           ├── 01.jpg
│           ├── 02.jpg
│           └── showreel.mp4       ← optional
└── projects/
    └── brand-identity-xyz/
        ├── meta.json
        └── assets/
            ├── cover.jpg          ← required
            ├── 01.jpg
            ├── 02.jpg
            └── 03.jpg
```

### meta.json Schema — Highlight Projects

```json
{
  "title": "Ferrari Showreel",
  "slug": "ferrari-showreel",
  "year": "2024",
  "category": "Automotive",
  "type": "Showreel",
  "description": "One line. No fluff.",
  "cover": "assets/cover.jpg",
  "assets": [
    { "type": "image", "src": "assets/01.jpg" },
    { "type": "image", "src": "assets/02.jpg" },
    { "type": "video", "src": "assets/showreel.mp4" }
  ],
  "highlight": true
}
```

### meta.json Schema — All Projects

```json
{
  "title": "Brand Identity for XYZ",
  "slug": "brand-identity-xyz",
  "year": "2024",
  "category": "F&B",
  "type": "Branding",
  "description": "One line. No fluff.",
  "cover": "assets/cover.jpg",
  "assets": [
    { "type": "image", "src": "assets/01.jpg" },
    { "type": "image", "src": "assets/02.jpg" },
    { "type": "image", "src": "assets/03.jpg" }
  ],
  "highlight": false
}
```

**Valid `category` values:** `Automotive`, `F&B`, `Events`, `Hospitality`, `Fashion`, `Music`, `Tech`, `Other`

**Valid `type` values:** `Photography`, `Videography`, `Branding`, `Design`, `UI/UX`, `Aftermovie`, `Showreel`, `Campaign`

---

## Build-Time Manifest Script

**File:** `scripts/generate-manifest.js`

This script runs before every Vite build. It scans `content/highlight/` and `content/projects/`, reads each `meta.json`, resolves asset paths relative to the output `public/content/` directory, and writes `src/manifest.js`.

```js
// scripts/generate-manifest.js
import fs from 'fs'
import path from 'path'

const HIGHLIGHT_DIR = './content/highlight'
const PROJECTS_DIR = './content/projects'
const OUTPUT = './src/manifest.js'

function readProjects(dir, basePublicPath) {
  const slugs = fs.readdirSync(dir).filter(f =>
    fs.statSync(path.join(dir, f)).isDirectory()
  )
  return slugs.map(slug => {
    const meta = JSON.parse(
      fs.readFileSync(path.join(dir, slug, 'meta.json'), 'utf8')
    )
    // Resolve asset paths to public URLs
    meta.cover = `${basePublicPath}/${slug}/${meta.cover}`
    meta.assets = meta.assets.map(a => ({
      ...a,
      src: `${basePublicPath}/${slug}/${a.src}`
    }))
    return meta
  })
}

const highlight = readProjects(HIGHLIGHT_DIR, '/content/highlight')
const projects = readProjects(PROJECTS_DIR, '/content/projects')

const output = `// AUTO-GENERATED — DO NOT EDIT
export const highlightProjects = ${JSON.stringify(highlight, null, 2)};
export const allProjects = ${JSON.stringify(projects, null, 2)};
`

fs.writeFileSync(OUTPUT, output)
console.log(`Manifest written: ${highlight.length} highlight, ${projects.length} projects`)
```

**vite.config.js** — run script before build:

```js
import { defineConfig } from 'vite'
import { execSync } from 'child_process'

export default defineConfig({
  plugins: [
    {
      name: 'generate-manifest',
      buildStart() {
        execSync('node scripts/generate-manifest.js', { stdio: 'inherit' })
      }
    }
  ],
  publicDir: 'content'  // serves content/ folder as static assets
})
```

---

## Design Tokens

**File:** `src/style/tokens.css`

```css
:root {
  --color-black: #0a0a0a;
  --color-white: #f0ede8;        /* slightly warm white, not pure */
  --color-gray-dim: #5a5a5a;
  --color-grain-opacity: 0.06;
  --color-halation: rgba(240, 237, 232, 0.07);

  --font-display: 'YourDisplayFont', sans-serif;   /* condensed bold */
  --font-body: 'YourBodyFont', sans-serif;

  --size-nav-height: 56px;
  --size-section-pad-v: clamp(80px, 10vw, 140px);
  --size-section-pad-h: clamp(24px, 5vw, 80px);

  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 0.3s;
  --duration-medium: 0.6s;
  --duration-slow: 1.2s;

  --grain-size: 180px;
}
```

---

## Global: Grain + Halation Overlay

**File:** `src/style/grain.css`

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: var(--color-grain-opacity);
  background-image: url("data:image/svg+xml,..."); /* inline SVG noise */
  background-size: var(--grain-size);
  animation: grain-shift 0.5s steps(1) infinite;
}

@keyframes grain-shift {
  0%   { transform: translate(0, 0); }
  20%  { transform: translate(-3%, -5%); }
  40%  { transform: translate(5%, 3%); }
  60%  { transform: translate(-4%, 6%); }
  80%  { transform: translate(3%, -4%); }
  100% { transform: translate(0, 0); }
}
```

Halation is applied per-element via `text-shadow` and `box-shadow` on key display headings:

```css
.halation-text {
  text-shadow:
    0 0 40px rgba(240, 237, 232, 0.25),
    0 0 80px rgba(240, 237, 232, 0.1);
}
```

---

## Global: Custom Cursor

**File:** `src/modules/cursor.js`

Two elements: `.cursor-ball` (circle, mix-blend-mode: difference) and `.cursor-pill` (trailing "View" label).

```js
// cursor.js
export function initCursor() {
  const ball = document.createElement('div')
  ball.className = 'cursor-ball'
  const pill = document.createElement('div')
  pill.className = 'cursor-pill'
  pill.textContent = 'View'
  document.body.append(ball, pill)

  let mx = 0, my = 0
  let px = 0, py = 0

  document.addEventListener('mousemove', e => {
    mx = e.clientX
    my = e.clientY
  })

  // Ball follows immediately, pill springs behind
  function tick() {
    ball.style.transform = `translate(${mx}px, ${my}px)`
    px += (mx - px) * 0.12
    py += (my - py) * 0.12
    pill.style.transform = `translate(${px}px, ${py}px)`
    requestAnimationFrame(tick)
  }
  tick()

  // Activate pill only over media elements
  document.querySelectorAll('[data-cursor-view]').forEach(el => {
    el.addEventListener('mouseenter', () => pill.classList.add('active'))
    el.addEventListener('mouseleave', () => pill.classList.remove('active'))
  })
}
```

```css
/* in base.css */
* { cursor: none; }

.cursor-ball {
  position: fixed;
  top: -20px; left: -20px;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--color-white);
  mix-blend-mode: difference;
  pointer-events: none;
  z-index: 10000;
  will-change: transform;
}

.cursor-pill {
  position: fixed;
  top: -16px; left: -36px;
  padding: 6px 14px;
  border-radius: 100px;
  background: var(--color-white);
  color: var(--color-black);
  font-size: 12px;
  font-family: var(--font-body);
  pointer-events: none;
  z-index: 10000;
  opacity: 0;
  transform-origin: center;
  transition: opacity 0.2s ease;
  will-change: transform;
}

.cursor-pill.active { opacity: 1; }
```

---

## Navigation

Fixed top bar, full width, no links. Wordmark left, live local time right.

```html
<nav class="nav">
  <span class="nav-wordmark">515 House</span>
  <span class="nav-time" id="nav-time"></span>
</nav>
```

```js
// in main.js
function startClock() {
  const el = document.getElementById('nav-time')
  function update() {
    el.textContent = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }
  update()
  setInterval(update, 1000)
}
```

```css
.nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--size-nav-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--size-section-pad-h);
  z-index: 1000;
  mix-blend-mode: difference;  /* white text inverts over any background */
}
```

---

## Section 01 — Hero (WebGL Ripple)

**File:** `src/modules/hero-webgl.js`

A full-viewport canvas sits behind a single hero image. The canvas uses OGL to render a subdivided plane mesh with a displacement shader. Mouse movement pushes vertex positions; displacement decays over time like a water surface.

### HTML

```html
<section id="hero">
  <canvas id="hero-canvas"></canvas>
  <img class="hero-image" src="/content/highlight/[best-shot]/assets/cover.jpg" alt="">
  <div class="hero-bottom-left">
    <span class="hero-tagline">Creative agency. Three people.</span>
  </div>
  <div class="hero-bottom-right">
    <span class="hero-scroll-hint">[ Scroll ]</span>
  </div>
</section>
```

### WebGL Implementation Notes

Use OGL's `Mesh` with a `Plane` geometry of high subdivision (64x64 segments minimum). The vertex shader displaces Y position based on a ripple map texture that is updated each frame. The ripple map is a Float32 buffer updated on CPU each frame:

- On `mousemove`, add a gaussian splat at the cursor position in the ripple buffer
- Each frame, simulate wave propagation: `new[i] = (prev[i-1] + prev[i+1] + prev[i-w] + prev[i+w]) / 2 - new[i]`
- Apply damping: multiply by 0.985 each frame
- Upload updated buffer as a DataTexture to the GPU

The hero image is rendered as a texture on the plane mesh. No separate DOM image element needed once WebGL is initialized — hide the fallback `<img>` after canvas is ready.

```glsl
// vertex shader excerpt
attribute vec2 uv;
attribute vec3 position;
uniform sampler2D uRipple;
uniform float uTime;
void main() {
  vec4 ripple = texture2D(uRipple, uv);
  vec3 pos = position;
  pos.z += ripple.r * 0.15;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

```glsl
// fragment shader excerpt
uniform sampler2D uTexture;
varying vec2 vUv;
uniform sampler2D uRipple;
void main() {
  vec4 ripple = texture2D(uRipple, vUv);
  vec2 distortedUv = vUv + ripple.rg * 0.02;
  gl_FragColor = texture2D(uTexture, distortedUv);
}
```

### CSS

```css
#hero {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-black);
}

#hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-bottom-left {
  position: absolute;
  bottom: 32px;
  left: var(--size-section-pad-h);
}

.hero-bottom-right {
  position: absolute;
  bottom: 32px;
  right: var(--size-section-pad-h);
}

.hero-tagline {
  font-family: var(--font-body);
  font-size: clamp(12px, 1.2vw, 14px);
  color: var(--color-white);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
}
```

---

## Section 02 — Highlight Projects (Asymmetric Grid)

**File:** `src/modules/highlight-grid.js`

Reads from `highlightProjects` in manifest. Renders an asymmetric CSS grid where card sizes vary. Layout follows a repeating pattern: two equal cards top row, one full-width card below, repeat.

### HTML Template (generated from manifest)

```html
<section id="highlight">
  <div class="highlight-header">
    <span class="section-label">[Selected Work]</span>
  </div>
  <div class="highlight-grid">
    <!-- cards injected by JS -->
  </div>
</section>
```

### JS Card Renderer

```js
import { highlightProjects } from '../manifest.js'

export function initHighlight() {
  const grid = document.querySelector('.highlight-grid')

  highlightProjects.forEach((project, i) => {
    const card = document.createElement('div')
    // Alternating grid spans: even index = half, odd index = half,
    // every 3rd = full width
    card.className = `highlight-card ${i % 3 === 2 ? 'full' : 'half'}`
    card.setAttribute('data-cursor-view', '')
    card.innerHTML = `
      <div class="highlight-card-media">
        ${project.assets[0]?.type === 'video'
          ? `<video src="${project.cover}" autoplay muted loop playsinline></video>`
          : `<img src="${project.cover}" alt="${project.title}" loading="lazy">`
        }
      </div>
      <div class="highlight-card-info">
        <div class="highlight-card-tags">
          <span class="tag-year">${project.year}</span>
          <span class="tag-category">${project.category}</span>
        </div>
        <h3 class="highlight-card-title">${project.title}</h3>
        <p class="highlight-card-desc">${project.description}</p>
      </div>
    `
    grid.appendChild(card)
  })
}
```

### CSS

```css
.highlight-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 var(--size-section-pad-h);
}

.highlight-card.full {
  grid-column: 1 / -1;
}

.highlight-card-media {
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  border-radius: 4px;
  background: #111;
}

.highlight-card-media img,
.highlight-card-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s var(--ease-out-expo);
}

.highlight-card:hover .highlight-card-media img,
.highlight-card:hover .highlight-card-media video {
  transform: scale(1.03);
}

.highlight-card-info {
  padding: 12px 0 24px;
}

.highlight-card-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.tag-year, .tag-category {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-gray-dim);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid #2a2a2a;
  padding: 2px 8px;
  border-radius: 100px;
}

.highlight-card-title {
  font-family: var(--font-display);
  font-size: clamp(18px, 2vw, 26px);
  color: var(--color-white);
  font-weight: 700;
  margin: 0 0 4px;
}

.highlight-card-desc {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-gray-dim);
  margin: 0;
}
```

---

## Section 03 — Services (Column Hover Expand)

**File:** `src/modules/services-columns.js`

Five columns separated by 1px rules. All columns start at equal width. On hover, hovered column expands, others contract. The expanded column reveals an image/video and a short description block.

### Data Structure (hardcoded, not from manifest)

```js
export const services = [
  {
    id: 'photo-film',
    label: 'Photography & Film',
    description: 'Stills and motion. Editorial, commercial, events.',
    media: { type: 'image', src: '/content/services/photo.jpg' }
  },
  {
    id: 'design-brand',
    label: 'Design & Branding',
    description: 'Identity systems, print, digital.',
    media: { type: 'image', src: '/content/services/design.jpg' }
  },
  {
    id: 'events',
    label: 'Events & Aftermovies',
    description: 'Concert coverage, venue documentation, recap films.',
    media: { type: 'video', src: '/content/services/events.mp4' }
  },
  {
    id: 'fnb-hosp',
    label: 'F&B & Hospitality',
    description: 'Menu shoots, ambiance, brand story.',
    media: { type: 'image', src: '/content/services/fnb.jpg' }
  },
  {
    id: 'uiux',
    label: 'UI/UX & Digital',
    description: 'Product design, interfaces, web.',
    media: { type: 'image', src: '/content/services/uiux.jpg' }
  }
]
```

### JS Interaction

```js
export function initServices() {
  const container = document.querySelector('.services-columns')
  const cols = container.querySelectorAll('.service-col')

  cols.forEach(col => {
    col.addEventListener('mouseenter', () => {
      cols.forEach(c => c.classList.remove('active'))
      col.classList.add('active')
    })
  })

  container.addEventListener('mouseleave', () => {
    cols.forEach(c => c.classList.remove('active'))
  })
}
```

### CSS

```css
.services-columns {
  display: flex;
  border-top: 1px solid #2a2a2a;
  height: 480px;
  overflow: hidden;
}

.service-col {
  flex: 1;
  border-right: 1px solid #2a2a2a;
  overflow: hidden;
  transition: flex 0.7s var(--ease-out-expo);
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24px;
}

.service-col:last-child { border-right: none; }

.service-col.active { flex: 3.5; }

.service-col-media {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.service-col.active .service-col-media { opacity: 1; }

.service-col-media img,
.service-col-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* dark overlay so text stays readable */
.service-col.active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
}

.service-col-label {
  font-family: var(--font-display);
  font-size: clamp(14px, 1.4vw, 18px);
  color: var(--color-white);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  transition: writing-mode 0s 0.4s, transform 0s 0.4s;
}

.service-col.active .service-col-label {
  writing-mode: horizontal-tb;
  transform: none;
  transition: none;
}

.service-col-desc {
  font-family: var(--font-body);
  font-size: 13px;
  color: rgba(240, 237, 232, 0.7);
  margin-top: 8px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s;
}

.service-col.active .service-col-desc {
  opacity: 1;
  transform: none;
}
```

---

## Section 04 — Perks of Working With Us (Stacked Cards + Get in Touch)

**File:** `src/modules/perks-stack.js`

Cards stack as user scrolls. Each card pins via ScrollTrigger. The last card is dark with "Get in Touch" text that slides from right-aligned to center on hover.

### Perks Data (hardcoded)

```js
export const perks = [
  {
    heading: 'You talk to the person doing the work.',
    body: 'No account managers. No briefing chains. Direct line to whoever is on your project.'
  },
  {
    heading: 'Small team. Faster decisions.',
    body: 'Three people means nothing gets lost. Feedback lands, changes happen.'
  },
  {
    heading: 'We scale when you need it.',
    body: 'For larger productions we bring in trusted collaborators. Same quality, bigger output.'
  },
  {
    heading: "We've done Ferrari. We'll do you just as well.",
    body: 'Prestige work is the floor, not the ceiling.'
  },
  {
    type: 'cta',
    heading: 'Get in Touch'
  }
]
```

### JS (GSAP ScrollTrigger Stacking)

```js
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export function initPerks() {
  const cards = gsap.utils.toArray('.perk-card')

  cards.forEach((card, i) => {
    ScrollTrigger.create({
      trigger: card,
      start: `top ${80 - i * 4}px`,  // each card stacks slightly lower
      pin: true,
      pinSpacing: false,
      endTrigger: '.perks-section',
      end: 'bottom bottom'
    })
    // slight scale-down on cards behind
    gsap.to(card, {
      scale: 1 - (cards.length - 1 - i) * 0.02,
      scrollTrigger: {
        trigger: card,
        start: 'top top',
        scrub: true
      }
    })
  })

  // Get in Touch hover animation
  const ctaCard = document.querySelector('.perk-card-cta')
  const ctaText = ctaCard?.querySelector('.perk-cta-text')
  if (!ctaCard || !ctaText) return

  ctaCard.addEventListener('mouseenter', () => {
    gsap.to(ctaText, {
      x: '-25%',
      duration: 0.5,
      ease: 'power3.out'
    })
  })
  ctaCard.addEventListener('mouseleave', () => {
    gsap.to(ctaText, {
      x: '0%',
      duration: 0.5,
      ease: 'power3.out'
    })
  })
}
```

### CSS

```css
.perks-section {
  padding: var(--size-section-pad-v) 0;
}

.perk-card {
  margin: 0 auto;
  width: calc(100% - var(--size-section-pad-h) * 2);
  max-width: 1200px;
  background: #111;
  border-radius: 8px;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 200px;
  border: 1px solid #1e1e1e;
  transform-origin: top center;
}

.perk-card-cta {
  background: var(--color-black);
  border: 1px solid #2a2a2a;
  min-height: 100px;
  align-items: center;
  justify-content: flex-end;
  flex-direction: row;
  overflow: hidden;
  cursor: pointer;
}

.perk-cta-text {
  font-family: var(--font-display);
  font-size: clamp(32px, 4vw, 56px);
  color: var(--color-white);
  font-weight: 700;
  text-transform: uppercase;
  will-change: transform;
}

.perk-heading {
  font-family: var(--font-display);
  font-size: clamp(22px, 2.5vw, 36px);
  color: var(--color-white);
  font-weight: 700;
  text-transform: uppercase;
}

.perk-body {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-gray-dim);
  max-width: 480px;
  line-height: 1.6;
}
```

---

## Section 05 — About / Team

**File:** `src/modules/about-split.js`

On scroll entry into section, a centered heading splits to opposite edges. Team photo in center scales up softly on scroll.

### HTML

```html
<section id="about" class="about-section">
  <div class="about-heading-wrap">
    <span class="about-word-left">THREE</span>
    <span class="about-word-right">PEOPLE</span>
  </div>
  <div class="about-photo-wrap">
    <img class="about-photo" src="/content/team/team.jpg" alt="515 House team">
  </div>
  <div class="about-copy-wrap">
    <p class="about-copy">
      We're three. We've shot for Ferrari.<br>
      When a job needs more hands, we know exactly who to call.
    </p>
    <div class="about-socials">
      [ INSTAGRAM. BEHANCE. LINKEDIN ]
    </div>
  </div>
</section>
```

### JS

```js
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initAbout() {
  const left = document.querySelector('.about-word-left')
  const right = document.querySelector('.about-word-right')
  const photo = document.querySelector('.about-photo')

  // Text split on scroll entry
  gsap.fromTo([left, right],
    { x: 0, opacity: 0.3 },
    {
      x: (i) => i === 0 ? '-38vw' : '38vw',
      opacity: 1,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: '.about-section',
        start: 'top 70%',
        end: 'top 20%',
        scrub: 1
      }
    }
  )

  // Photo parallax zoom
  gsap.fromTo(photo,
    { scale: 1 },
    {
      scale: 1.08,
      ease: 'none',
      scrollTrigger: {
        trigger: '.about-photo-wrap',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    }
  )
}
```

### CSS

```css
.about-section {
  padding: var(--size-section-pad-v) var(--size-section-pad-h);
  overflow: hidden;
  position: relative;
  text-align: center;
}

.about-heading-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120px;
  margin-bottom: 40px;
}

.about-word-left,
.about-word-right {
  font-family: var(--font-display);
  font-size: clamp(64px, 10vw, 140px);
  font-weight: 900;
  color: var(--color-white);
  text-transform: uppercase;
  position: absolute;
  will-change: transform;
}

.about-photo-wrap {
  width: clamp(280px, 50vw, 640px);
  margin: 0 auto;
  overflow: hidden;
  border-radius: 4px;
}

.about-photo {
  width: 100%;
  display: block;
  will-change: transform;
  filter: grayscale(20%);
}

.about-copy {
  font-family: var(--font-body);
  font-size: clamp(14px, 1.4vw, 17px);
  color: var(--color-white);
  line-height: 1.7;
  margin: 32px auto 0;
  max-width: 520px;
}

.about-socials {
  margin-top: 20px;
  font-family: var(--font-body);
  font-size: 12px;
  letter-spacing: 0.15em;
  color: var(--color-gray-dim);
  text-transform: uppercase;
}
```

---

## Section 06 — All Projects (Masonry Grid + "View All" Link)

**File:** `src/modules/projects-masonry.js`

Rendered on `index.html`. Masonry grid using CSS `columns` property. Viewport-edge blur via `::before`/`::after` pseudo-elements with a radial gradient mask. "View All Projects" navigates to `projects.html`.

### JS

```js
import { allProjects } from '../manifest.js'

export function initProjectsMasonry() {
  const grid = document.querySelector('.masonry-grid')
  const MAX_PREVIEW = 9  // show 9 on homepage

  allProjects.slice(0, MAX_PREVIEW).forEach(project => {
    const item = document.createElement('div')
    item.className = 'masonry-item'
    item.setAttribute('data-cursor-view', '')
    item.innerHTML = `
      <div class="masonry-media">
        <img src="${project.cover}" alt="${project.title}" loading="lazy">
      </div>
      <div class="masonry-meta">
        <span class="masonry-year">${project.year}</span>
        <span class="masonry-type">${project.type}</span>
        <span class="masonry-title">${project.title}</span>
      </div>
    `
    grid.appendChild(item)
  })
}
```

### CSS

```css
.projects-section {
  padding: var(--size-section-pad-v) var(--size-section-pad-h);
  position: relative;
}

/* Viewport edge vignette */
.projects-section::before,
.projects-section::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  width: 120px;
  pointer-events: none;
  z-index: 2;
}

.projects-section::before {
  left: 0;
  background: linear-gradient(to right, var(--color-black), transparent);
}

.projects-section::after {
  right: 0;
  background: linear-gradient(to left, var(--color-black), transparent);
}

.masonry-grid {
  columns: 3;
  column-gap: 10px;
}

@media (max-width: 900px) { .masonry-grid { columns: 2; } }
@media (max-width: 560px) { .masonry-grid { columns: 1; } }

.masonry-item {
  break-inside: avoid;
  margin-bottom: 10px;
}

.masonry-media {
  width: 100%;
  overflow: hidden;
  border-radius: 3px;
}

.masonry-media img {
  width: 100%;
  display: block;
  transition: transform 0.6s var(--ease-out-expo);
}

.masonry-item:hover .masonry-media img {
  transform: scale(1.04);
}

.masonry-meta {
  padding: 8px 2px 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.masonry-year {
  font-size: 11px;
  font-family: var(--font-body);
  color: var(--color-gray-dim);
}

.masonry-type {
  font-size: 11px;
  font-family: var(--font-body);
  color: var(--color-gray-dim);
  border: 1px solid #2a2a2a;
  padding: 1px 6px;
  border-radius: 100px;
}

.masonry-title {
  font-size: 13px;
  font-family: var(--font-body);
  color: var(--color-white);
  width: 100%;
}

.view-all-link {
  display: inline-block;
  margin-top: 40px;
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-white);
  text-decoration: none;
  border-bottom: 1px solid var(--color-white);
  padding-bottom: 2px;
}
```

---

## Page: /projects.html — Row-by-Row Listing

**File:** `src/projects-page.js`

Full separate page. Reads all projects from manifest, renders them as thin-rule rows with filter controls above.

### HTML Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>All Projects — 515 House</title>
  <link rel="stylesheet" href="/src/style/base.css">
  <link rel="stylesheet" href="/src/style/sections/projects-page.css">
</head>
<body>
  <nav class="nav">...</nav>
  <main class="projects-page">
    <div class="projects-page-header">
      <a class="back-link" href="/">← Back</a>
      <h1 class="projects-page-title">All Work</h1>
    </div>
    <div class="projects-filters">
      <div class="filter-group" data-filter="category">
        <span class="filter-label">Industry</span>
        <button class="filter-btn active" data-value="all">All</button>
        <button class="filter-btn" data-value="Automotive">Automotive</button>
        <button class="filter-btn" data-value="F&B">F&B</button>
        <button class="filter-btn" data-value="Events">Events</button>
        <button class="filter-btn" data-value="Hospitality">Hospitality</button>
        <button class="filter-btn" data-value="Fashion">Fashion</button>
        <button class="filter-btn" data-value="Music">Music</button>
      </div>
      <div class="filter-group" data-filter="type">
        <span class="filter-label">Type</span>
        <button class="filter-btn active" data-value="all">All</button>
        <button class="filter-btn" data-value="Photography">Photography</button>
        <button class="filter-btn" data-value="Videography">Videography</button>
        <button class="filter-btn" data-value="Branding">Branding</button>
        <button class="filter-btn" data-value="Design">Design</button>
      </div>
    </div>
    <div class="projects-list" id="projects-list"></div>
  </main>
  <script type="module" src="/src/projects-page.js"></script>
</body>
</html>
```

### JS

```js
import { allProjects } from './manifest.js'

let activeCategory = 'all'
let activeType = 'all'

function render() {
  const list = document.getElementById('projects-list')
  list.innerHTML = ''

  const filtered = allProjects.filter(p => {
    const catMatch = activeCategory === 'all' || p.category === activeCategory
    const typeMatch = activeType === 'all' || p.type === activeType
    return catMatch && typeMatch
  })

  filtered.forEach((project, i) => {
    const row = document.createElement('a')
    row.className = 'project-row'
    row.href = `/project/${project.slug}`  // future: project detail page
    row.setAttribute('data-cursor-view', '')
    row.innerHTML = `
      <div class="project-row-left">
        <span class="project-row-initial">${project.title[0]}</span>
        <div class="project-row-meta">
          <span class="project-row-category">${project.category}</span>
          <span class="project-row-year">${project.year}</span>
        </div>
      </div>
      <div class="project-row-center">
        <h2 class="project-row-title">${project.title}</h2>
        <p class="project-row-desc">${project.description}</p>
      </div>
      <div class="project-row-right">
        <img class="project-row-thumb" src="${project.cover}" alt="${project.title}" loading="lazy">
        <span class="project-row-cta">Discover the project ↗</span>
      </div>
    `
    list.appendChild(row)
  })
}

// Filter interaction
document.querySelectorAll('.filter-group').forEach(group => {
  group.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn')
    if (!btn) return
    group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const filterType = group.dataset.filter
    if (filterType === 'category') activeCategory = btn.dataset.value
    if (filterType === 'type') activeType = btn.dataset.value
    render()
  })
})

render()
```

### CSS

```css
.project-row {
  display: grid;
  grid-template-columns: 200px 1fr 280px;
  align-items: center;
  gap: 32px;
  padding: 28px 0;
  border-top: 1px solid #1e1e1e;
  text-decoration: none;
  transition: background 0.2s ease;
  cursor: none;
}

.project-row:last-child { border-bottom: 1px solid #1e1e1e; }

.project-row:hover { background: #0f0f0f; }

.project-row-initial {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 900;
  color: #1e1e1e;
  line-height: 1;
}

.project-row-title {
  font-family: var(--font-display);
  font-size: clamp(22px, 2.5vw, 36px);
  font-weight: 700;
  color: var(--color-white);
  text-transform: uppercase;
  margin: 0 0 6px;
}

.project-row-desc {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-gray-dim);
  margin: 0;
}

.project-row-thumb {
  width: 180px;
  height: 100px;
  object-fit: cover;
  border-radius: 3px;
  display: block;
}

.project-row-cta {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-gray-dim);
  letter-spacing: 0.06em;
  margin-top: 8px;
  display: block;
}

.filter-btn {
  background: none;
  border: 1px solid #2a2a2a;
  color: var(--color-gray-dim);
  padding: 4px 12px;
  border-radius: 100px;
  font-family: var(--font-body);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: none;
  transition: all 0.2s ease;
}

.filter-btn.active,
.filter-btn:hover {
  border-color: var(--color-white);
  color: var(--color-white);
}
```

---

## Section 07 — Contact

### HTML

```html
<section id="contact" class="contact-section">
  <div class="contact-inner">
    <div class="contact-info">
      <a class="contact-email" href="mailto:hello@515house.com">hello@515house.com</a>
      <a class="contact-insta" href="https://instagram.com/515house" target="_blank">@515house</a>
    </div>
    <form class="contact-form" id="contact-form">
      <div class="form-field">
        <label>Name</label>
        <input type="text" name="name" autocomplete="off">
      </div>
      <div class="form-field">
        <label>Brand / Company</label>
        <input type="text" name="brand" autocomplete="off">
      </div>
      <div class="form-field">
        <label>What do you need</label>
        <textarea name="message" rows="3"></textarea>
      </div>
      <button type="submit" class="form-submit">Send it</button>
    </form>
  </div>
</section>
```

Form submission handled via Netlify Forms (add `data-netlify="true"` attribute) or Formspree — no backend required.

---

## Section 08 — Footer (Inline Media in Heading)

**File:** `src/modules/footer.js`

A closing display heading with a small looping video or image clip embedded inline, replacing or interrupting a word mid-sentence.

### HTML

```html
<footer class="footer">
  <div class="footer-statement">
    <span class="footer-text-a">Made with </span>
    <span class="footer-media-embed">
      <video autoplay muted loop playsinline src="/content/footer/clip.mp4"></video>
    </span>
    <span class="footer-text-b"> in every frame.</span>
  </div>
  <div class="footer-bottom">
    <span class="footer-wordmark">515 House</span>
    <span class="footer-copy">© 2024</span>
  </div>
</footer>
```

### CSS

```css
.footer {
  padding: var(--size-section-pad-v) var(--size-section-pad-h);
  border-top: 1px solid #1e1e1e;
}

.footer-statement {
  font-family: var(--font-display);
  font-size: clamp(32px, 6vw, 80px);
  font-weight: 900;
  color: var(--color-white);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  line-height: 1;
}

.footer-media-embed {
  display: inline-flex;
  width: clamp(60px, 8vw, 120px);
  aspect-ratio: 4/3;
  overflow: hidden;
  border-radius: 6px;
  vertical-align: middle;
  position: relative;
  top: -4px;
}

.footer-media-embed video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  margin-top: 48px;
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-gray-dim);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

---

## Scroll Anchoring (index.html)

Nav has no links but sections can be targeted via hash. All in-page section jumps use GSAP smooth scroll:

```js
document.querySelectorAll('[data-scroll-to]').forEach(el => {
  el.addEventListener('click', () => {
    const target = document.querySelector(el.dataset.scrollTo)
    if (target) gsap.to(window, {
      scrollTo: { y: target, offsetY: 56 },
      duration: 1.2,
      ease: 'power4.inOut'
    })
  })
})
```

Add `gsap/ScrollToPlugin` to GSAP imports.

---

## Asset Checklist for Client

### Required Before Build

**Hero**
- [ ] 1 full-bleed hero image (min 2560×1440px, JPG, high contrast, works dark)

**Highlight Projects** — per project folder under `content/highlight/[slug]/`
- [ ] `meta.json` filled
- [ ] `assets/cover.jpg` (min 1600×1000px)
- [ ] 2–4 additional images or 1 video (optional)

**All Projects** — per project folder under `content/projects/[slug]/`
- [ ] `meta.json` filled
- [ ] `assets/cover.jpg` (min 800×600px)
- [ ] Additional images optional

**Team**
- [ ] `content/team/team.jpg` — team photo, landscape, high contrast, min 1400px wide

**Services** — per service, one image or looping video (5–10s, no audio)
- [ ] `content/services/photo.jpg`
- [ ] `content/services/design.jpg`
- [ ] `content/services/events.mp4`
- [ ] `content/services/fnb.jpg`
- [ ] `content/services/uiux.jpg`

**Footer**
- [ ] `content/footer/clip.mp4` — short looping clip, 3–6s, no audio, square or 4:3

**Fonts**
- [ ] Display font files (.woff2) in `public/fonts/`
- [ ] Body font files (.woff2) in `public/fonts/`

---

## package.json Scripts

```json
{
  "scripts": {
    "dev": "node scripts/generate-manifest.js && vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "gsap": "^3.12.0",
    "ogl": "^1.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

---

## Performance Notes

- All images use `loading="lazy"` except the hero
- Hero image preloaded via `<link rel="preload">` in `<head>`
- Videos: `autoplay muted loop playsinline`, no `preload` attribute (browser decides)
- Grain overlay uses CSS animation, not canvas, to avoid extra GPU load
- WebGL canvas pauses tick loop when tab is not visible (`document.addEventListener('visibilitychange')`)
- GSAP ScrollTrigger: call `ScrollTrigger.refresh()` after all DOM mutations
- Fonts: `font-display: swap`
- No external requests at runtime except form submission endpoint
