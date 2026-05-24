import '../style/sections/hero-v3.css'
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

// ── Physics Constants & Cell Type Profiles ───────────────────
export const CELL_PROFILES = {
  display_large: {
    damping: 0.88,          // friction damping
    repulseRadius: 220,
    repulseStrength: 1400,
    wordDamping: 0.89,
    wordMass: 3,
    wordRepulseStrength: 900
  },
  display_medium: {
    damping: 0.82,
    repulseRadius: 180,
    repulseStrength: 1100,
    wordDamping: 0.85,
    wordMass: 2,
    wordRepulseStrength: 700
  },
  display_small: {
    damping: 0.94,
    repulseRadius: 140,
    repulseStrength: 700,
    wordDamping: 0.91,
    wordMass: 1,
    wordRepulseStrength: 500
  },
  mono_label: {
    damping: 0.78,
    repulseRadius: 100,
    repulseStrength: 500,
    wordDamping: 0.78,
    wordMass: 0.5,
    wordRepulseStrength: 300
  }
}

const WORD_COLLISION_STR  = 0.3    // strength of character-character repulsion
const MAX_WORD_DISP       = 80     // px — clamp max letter displacement from rest
const SETTLE_THRESHOLD    = 0.05   // settle check value

// ── State ─────────────────────────────────────────────────────
let particles = []
let cursor = { x: -999, y: -999, vx: 0, vy: 0, prevX: -999, prevY: -999 }
let rafId = null
let isRunning = false
let lastCursorPos = null

// HMR and listener cleanups
let clockInterval = null
let resizeHandler = null
let themeObserver = null
let mouseMoveHandler = null
let mouseLeaveHandler = null

// Helper to resolve CSS variables to actual font-family strings
function getResolvedFontFamily(varName) {
  const cleanVar = varName.replace(/var\(|\)/g, '').trim();
  const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(cleanVar).trim();
  return resolved || 'sans-serif';
}

// Pretext wrapper to layout lines and resolve fitted font size
function layoutText(options) {
  const {
    text,
    width,
    height,
    fontSize,
    fontFamily,
    lineHeight,
    fitMode
  } = options;
  
  let resolvedFontFamily = fontFamily;
  if (fontFamily.startsWith('var(')) {
    resolvedFontFamily = getResolvedFontFamily(fontFamily);
  }
  
  let currentFontSize = fontSize;
  let finalLines = [];
  let finalFontSize = fontSize;
  
  const maxIterations = 15;
  for (let iter = 0; iter < maxIterations; iter++) {
    const fontStr = `${currentFontSize}px ${resolvedFontFamily}`;
    const approxLineHeight = currentFontSize * lineHeight;
    
    let prepared;
    try {
      prepared = prepareWithSegments(text, fontStr);
    } catch (e) {
      console.warn("Pretext prepare failed:", e);
      break;
    }
    
    let tempLines = [];
    try {
      const layoutRes = layoutWithLines(prepared, width, lineHeight);
      tempLines = layoutRes.lines.map((line, idx) => {
        return {
          text: line.text,
          width: line.width,
          x: 0,
          y: idx * approxLineHeight
        };
      });
    } catch (e) {
      console.warn("Pretext layoutWithLines failed:", e);
      break;
    }
    
    const totalHeight = tempLines.length * approxLineHeight;
    let fits = true;
    if (fitMode === 'shrink') {
      if (totalHeight > height) {
        fits = false;
      }
      for (const line of tempLines) {
        if (line.width > width) {
          fits = false;
          break;
        }
      }
    }
    
    if (fits || currentFontSize <= 8) {
      finalLines = tempLines;
      finalFontSize = currentFontSize;
      break;
    }
    
    currentFontSize = Math.max(8, currentFontSize - 2);
  }
  
  return {
    fontSize: finalFontSize,
    lines: finalLines
  };
}

// ── Update Single Cell Words (Clock) ───────────────────────────
function updateClockParticles(nowStr) {
  const clockEl = document.querySelector('.js-clock')
  if (!clockEl) return

  const clockParticles = particles.filter(p => p.isClock)
  if (clockParticles.length === 0) {
    rebuildClockParticles(nowStr)
    return
  }

  const chars = [...nowStr]
  // Update characters in-place to avoid physics reset and teleportation
  if (clockParticles.length === chars.length) {
    clockParticles.forEach((p, idx) => {
      const newChar = chars[idx]
      if (p.char !== newChar) {
        p.char = newChar
        p.el.textContent = newChar
      }
    })
  } else {
    rebuildClockParticles(nowStr)
  }
}

// Rebuild clock particles (fallback or initial load)
function rebuildClockParticles(nowStr) {
  const clockEl = document.querySelector('.js-clock')
  if (!clockEl) return
  
  const profile = CELL_PROFILES.mono_label
  const rect = clockEl.getBoundingClientRect()
  const scrollX = window.scrollX || window.pageXOffset || 0
  const scrollY = window.scrollY || window.pageYOffset || 0
  
  const pageLeft = rect.left + scrollX
  const pageTop = rect.top + scrollY
  const fontSize = parseFloat(clockEl.dataset.size) || 11
  
  const layout = layoutText({
    text: nowStr,
    width: rect.width,
    height: rect.height,
    fontSize,
    fontFamily: 'var(--font-body)',
    lineHeight: 0.92,
    fitMode: 'shrink'
  })
  
  // 1. Remove old clock spans from DOM and filter particles
  const oldClock = particles.filter(p => p.isClock)
  oldClock.forEach(p => p.el.remove())
  particles = particles.filter(p => !p.isClock)
  
  const sandbox = document.querySelector('.hero-sandbox')
  if (!sandbox) return
  
  // 2. Measure characters using canvas context
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const resolvedFont = getResolvedFontFamily('var(--font-body)')
  ctx.font = `${layout.fontSize}px ${resolvedFont}`
  
  layout.lines.forEach((line) => {
    const chars = [...line.text]
    let currentX = 0
    const lineParticles = []

    chars.forEach(char => {
      const charWidth = ctx.measureText(char).width
      
      if (char === ' ') {
        currentX += charWidth
        return
      }

      const span = document.createElement('span')
      span.className = 'hero-word'
      span.textContent = char
      span.dataset.cellText = '00:00:00'
      span.style.cssText = `
        position: absolute;
        left: 0px;
        top: 0px;
        font-size: ${layout.fontSize}px;
        white-space: nowrap;
        will-change: transform;
        transform: translate(${pageLeft + currentX}px, ${pageTop + line.y}px) scale(1);
      `
      sandbox.appendChild(span)

      const p = {
        el: span,
        restX: pageLeft + currentX,
        restY: pageTop + line.y,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        scale: 1.0,
        scaleX: 1.0,
        scaleY: 1.0,
        mass: Math.max(0.2, profile.wordMass * (layout.fontSize / 48)),
        damping: 0.84 + Math.random() * 0.12,
        repulseStrength: profile.wordRepulseStrength,
        repulseRadius: profile.repulseRadius * 0.75,
        width: charWidth,
        fontSize: layout.fontSize,
        isClock: true,
        char,
        next: null,
        prev: null
      }

      particles.push(p)
      lineParticles.push(p)
      currentX += charWidth
    })

    // Link neighbors for horizontal squeeze calculations
    for (let i = 0; i < lineParticles.length - 1; i++) {
      lineParticles[i].next = lineParticles[i + 1]
      lineParticles[i + 1].prev = lineParticles[i]
    }
  })
}

// ── Build Particles ───────────────────────────────────────────
function buildParticles(grid) {
  const cellEls = grid.querySelectorAll('.hero-cell')
  const scrollX = window.scrollX || window.pageXOffset || 0
  const scrollY = window.scrollY || window.pageYOffset || 0
  
  const sandbox = document.querySelector('.hero-sandbox')
  if (!sandbox) return

  cellEls.forEach(el => {
    const profile = CELL_PROFILES[el.dataset.profile] || CELL_PROFILES.display_medium
    const rect = el.getBoundingClientRect()
    const pageLeft = rect.left + scrollX
    const pageTop = rect.top + scrollY

    const text = el.dataset.text || el.textContent.trim()
    const fontSize = parseFloat(el.dataset.size) || 48

    const layout = layoutText({
      text,
      width: rect.width,
      height: rect.height,
      fontSize,
      fontFamily: el.dataset.font === 'mono' ? 'var(--font-body)' : 'var(--font-display)',
      lineHeight: 0.92,
      fitMode: 'shrink'
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const resolvedFont = el.dataset.font === 'mono' 
      ? getResolvedFontFamily('var(--font-body)')
      : getResolvedFontFamily('var(--font-display)')
    ctx.font = `${layout.fontSize}px ${resolvedFont}`

    layout.lines.forEach((line) => {
      const chars = [...line.text]
      let currentX = 0
      const lineParticles = []

      chars.forEach(char => {
        const charWidth = ctx.measureText(char).width
        
        if (char === ' ') {
          currentX += charWidth
          return
        }

        const span = document.createElement('span')
        span.className = 'hero-word'
        span.textContent = char
        span.dataset.cellText = el.dataset.text || ''
        span.style.cssText = `
          position: absolute;
          left: 0px;
          top: 0px;
          font-size: ${layout.fontSize}px;
          white-space: nowrap;
          will-change: transform;
          transform: translate(${pageLeft + currentX}px, ${pageTop + line.y}px) scale(1);
        `
        sandbox.appendChild(span)

        const p = {
          el: span,
          restX: pageLeft + currentX,
          restY: pageTop + line.y,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          scale: 1.0,
          scaleX: 1.0,
          scaleY: 1.0,
          mass: Math.max(0.2, profile.wordMass * (layout.fontSize / 48)),
          damping: 0.84 + Math.random() * 0.12,
          repulseStrength: profile.wordRepulseStrength,
          repulseRadius: profile.repulseRadius * 0.75,
          width: charWidth,
          fontSize: layout.fontSize,
          isClock: el.classList.contains('js-clock'),
          char,
          next: null,
          prev: null
        }

        particles.push(p)
        lineParticles.push(p)
        currentX += charWidth
      })

      // Link neighbors in the same line for horizontal squeeze
      for (let i = 0; i < lineParticles.length - 1; i++) {
        lineParticles[i].next = lineParticles[i + 1]
        lineParticles[i + 1].prev = lineParticles[i]
      }
    })
  })
}

// ── Bind Cursor tracking ──────────────────────────────────────
function bindCursor(hero) {
  if (mouseMoveHandler) hero.removeEventListener('mousemove', mouseMoveHandler)
  if (mouseLeaveHandler) hero.removeEventListener('mouseleave', mouseLeaveHandler)

  mouseMoveHandler = e => {
    cursor.x = e.pageX
    cursor.y = e.pageY
    lastCursorPos = { x: cursor.x, y: cursor.y }
    if (!isRunning) startLoop()
  }

  mouseLeaveHandler = () => {
    cursor.x = -999
    cursor.y = -999
    lastCursorPos = null
    if (!isRunning) startLoop()
  }

  hero.addEventListener('mousemove', mouseMoveHandler)
  hero.addEventListener('mouseleave', mouseLeaveHandler)
}

// ── Start Loop ────────────────────────────────────────────────
function startLoop() {
  if (isRunning) return
  isRunning = true
  cursor.prevX = cursor.x
  cursor.prevY = cursor.y
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(loop)
}

// ── Render single frame ───────────────────────────────────────
function renderFrame() {
  particles.forEach(word => {
    word.el.style.transform = `translate(${word.restX + word.x}px, ${word.restY + word.y}px) scale(${word.scaleX}, ${word.scaleY})`
  })
}

// ── Main Physics Loop ─────────────────────────────────────────
function loop() {
  let anyActive = false

  // 1. Calculate cursor speed and dynamic velocity-driven impulse factor
  let cursorSpeedFactor = 1.0
  if (cursor.x !== -999) {
    if (cursor.prevX !== -999) {
      cursor.vx = cursor.x - cursor.prevX
      cursor.vy = cursor.y - cursor.prevY
    } else {
      cursor.vx = 0
      cursor.vy = 0
    }
    cursor.prevX = cursor.x
    cursor.prevY = cursor.y
    const speed = Math.hypot(cursor.vx, cursor.vy)
    cursorSpeedFactor = 1.0 + Math.min(speed / 10, 4.0) // cap impulse boost at 5x
  } else {
    cursor.vx = 0
    cursor.vy = 0
    cursor.prevX = -999
    cursor.prevY = -999
  }

  // 2. Horizontal-only line-level character collisions
  // Group particles by their restY row to prevent different rows from pushing each other vertically.
  const linesMap = new Map()
  particles.forEach(p => {
    if (!linesMap.has(p.restY)) {
      linesMap.set(p.restY, [])
    }
    linesMap.get(p.restY).push(p)
  })

  linesMap.forEach(lineParticles => {
    for (let i = 0; i < lineParticles.length; i++) {
      const p1 = lineParticles[i]
      for (let j = i + 1; j < lineParticles.length; j++) {
        const p2 = lineParticles[j]
        
        const dx = (p1.restX + p1.x) - (p2.restX + p2.x)
        const dist = Math.abs(dx) || 1
        
        // Sum of half-widths scaled by minimum current scale
        const minDist = (p1.width + p2.width) * 0.5 * 0.95 * Math.min(p1.scale, p2.scale)
        
        if (dist < minDist) {
          const push = (minDist - dist) * WORD_COLLISION_STR
          // Push away horizontally
          const fx = (dx < 0 ? -1 : 1) * push * 0.016
          
          p1.vx += fx / p1.mass
          p2.vx -= fx / p2.mass
        }
      }
    }
  })

  // 3. Integrate particle positions and apply repulsion/decay
  particles.forEach(word => {
    const wax = word.restX + word.x
    const way = word.restY + word.y

    // Cursor repulsion (Two stages: violent inner zone and gentle magnetic outer zone)
    const wdx = wax - cursor.x
    const wdy = way - cursor.y
    const wdist = Math.sqrt(wdx*wdx + wdy*wdy) || 1

    if (cursor.x !== -999) {
      let force = 0
      if (wdist < 60) {
        // Stage 1: violent inner zone push
        const proximity = 1.0 - wdist / 60
        force = cursorSpeedFactor * (word.repulseStrength * 2.2 / word.mass) * Math.pow(proximity, 1.5)
      } else if (wdist < 200) {
        // Stage 2: gentle magnetic outer zone push
        const proximity = 1.0 - (wdist - 60) / (200 - 60)
        force = cursorSpeedFactor * (word.repulseStrength * 0.4 / word.mass) * Math.pow(proximity, 2.2)
      }
      
      word.vx += (wdx / wdist) * force * 0.016
      word.vy += (wdy / wdist) * force * 0.016
    }

    // Dynamic proximity-based scale steering
    let targetScale = 1.0
    if (wdist < 200 && cursor.x !== -999) {
      const proximity = 1.0 - wdist / 200
      targetScale = 1.0 - proximity * 0.45 // shrink down by up to 45%
    }
    word.scale += (targetScale - word.scale) * 0.15

    // Calculate letter horizontal compression (squeeze) based on neighbors
    let compression = 1.0
    if (word.next) {
      const restDist = word.next.restX - word.restX
      if (restDist > 0) {
        const currDist = (word.next.restX + word.next.x) - (word.restX + word.x)
        const ratio = currDist / (restDist * word.scale)
        if (ratio < 1.0) {
          compression = Math.min(compression, ratio)
        }
      }
    }
    if (word.prev) {
      const restDist = word.restX - word.prev.restX
      if (restDist > 0) {
        const currDist = (word.restX + word.x) - (word.prev.restX + word.prev.x)
        const ratio = currDist / (restDist * word.prev.scale)
        if (ratio < 1.0) {
          compression = Math.min(compression, ratio)
        }
      }
    }
    compression = Math.max(0.4, Math.min(1.0, compression))

    // Apply squash and stretch (stretch height slightly to preserve visual density)
    const targetScaleX = word.scale * compression
    const targetScaleY = word.scale * (1.0 + (1.0 - compression) * 0.3)
    
    word.scaleX += (targetScaleX - word.scaleX) * 0.15
    word.scaleY += (targetScaleY - word.scaleY) * 0.15

    // Kinetic return to rest (first-order exponential decay velocity steering, no bounce)
    const dist = Math.hypot(word.x, word.y) || 0.001
    const returnProximity = 1.0 - Math.min(dist / 150, 0.9)
    const returnStrength = 0.05 + 0.15 * returnProximity
    const targetWvx = -word.x * returnStrength
    const targetWvy = -word.y * returnStrength

    word.vx += (targetWvx - word.vx) * 0.20
    word.vy += (targetWvy - word.vy) * 0.20

    // Damping
    word.vx *= word.damping
    word.vy *= word.damping

    // Integrate positions
    word.x += word.vx
    word.y += word.vy

    // Clamp displacement
    word.x = Math.max(-MAX_WORD_DISP, Math.min(MAX_WORD_DISP, word.x))
    word.y = Math.max(-MAX_WORD_DISP, Math.min(MAX_WORD_DISP, word.y))

    // Apply translations
    word.el.style.transform = `translate(${word.restX + word.x}px, ${word.restY + word.y}px) scale(${word.scaleX}, ${word.scaleY})`

    // Settle threshold checks
    if (Math.abs(word.vx) > SETTLE_THRESHOLD ||
        Math.abs(word.vy) > SETTLE_THRESHOLD ||
        Math.abs(word.x) > SETTLE_THRESHOLD ||
        Math.abs(word.y) > SETTLE_THRESHOLD ||
        Math.abs(word.scaleX - 1.0) > 0.01 ||
        Math.abs(word.scaleY - 1.0) > 0.01) {
      anyActive = true
    }
  })

  if (anyActive) {
    rafId = requestAnimationFrame(loop)
  } else {
    isRunning = false
  }
}

// ── Initialize Hero V3 ────────────────────────────────────────
export function initHeroV3() {
  const hero = document.getElementById('hero')
  if (!hero) return

  // Clean up any existing instances first (handles HMR module hot re-initialization)
  if (clockInterval) clearInterval(clockInterval)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (themeObserver) themeObserver.disconnect()
  if (mouseMoveHandler) hero.removeEventListener('mousemove', mouseMoveHandler)
  if (mouseLeaveHandler) hero.removeEventListener('mouseleave', mouseLeaveHandler)

  // Inject scaffold grid and flat layer if not already present
  if (!hero.querySelector('.hero-sandbox')) {
    hero.className = 'hero-v3'
    hero.innerHTML = `
      <div class="hero-sandbox"></div>
      <div class="hero-grid">
        <div class="hero-cell span-col-5 span-row-4"
             data-text="515" data-size="180" data-profile="display_large"
             data-font="display"></div>

        <div class="hero-cell span-col-7 span-row-2"
             data-text="HOUSE" data-size="140" data-profile="display_large"
             data-font="display"></div>

        <div class="hero-cell span-col-3 span-row-1"
             data-text="Creative Agency" data-size="13"
             data-profile="mono_label" data-font="mono"></div>

        <div class="hero-cell span-col-4 span-row-1"
             data-text="Gurugram India" data-size="13"
             data-profile="mono_label" data-font="mono"></div>

        <div class="hero-cell span-col-7 span-row-1"
             data-text="Three people. Every project." data-size="32"
             data-profile="display_small" data-font="display"></div>

        <div class="hero-cell span-col-4 span-row-2"
             data-text="PHOTO_FILM" data-size="72"
             data-profile="display_medium" data-font="display"></div>

        <div class="hero-cell span-col-4 span-row-2"
             data-text="DESIGN_BRAND" data-size="64"
             data-profile="display_medium" data-font="display"></div>

        <div class="hero-cell span-col-2 span-row-1"
             data-text="EVENTS" data-size="48"
             data-profile="display_small" data-font="display"></div>

        <div class="hero-cell span-col-2 span-row-1"
             data-text="UI_UX" data-size="48"
             data-profile="display_small" data-font="display"></div>

        <div class="hero-cell span-col-2 span-row-1"
             data-text="Est. 2024" data-size="11"
             data-profile="mono_label" data-font="mono"></div>

        <div class="hero-cell span-col-2 span-row-1"
             data-text="F&B" data-size="42"
             data-profile="display_small" data-font="display"></div>

        <div class="hero-cell span-col-8 span-row-1"
             data-text="We scale when you need it. You talk to the person doing the work."
             data-size="18" data-profile="display_small" data-font="mono"></div>

        <div class="hero-cell span-col-2 span-row-1"
             data-text="HOSPITALITY" data-size="28"
             data-profile="display_small" data-font="display"></div>

        <div class="hero-cell span-col-2 span-row-1"
             data-text="AFTERMOVIES" data-size="24"
             data-profile="display_small" data-font="display"></div>

        <div class="hero-cell span-col-4 span-row-1"
             data-text="Gurugram, IN" data-size="11"
             data-profile="mono_label" data-font="mono"></div>

        <div class="hero-cell span-col-4 span-row-1 js-clock"
             data-text="00:00:00" data-size="11"
             data-profile="mono_label" data-font="mono"></div>

        <div class="hero-cell span-col-4 span-row-1"
             data-text="↓ Scroll to explore" data-size="11"
             data-profile="mono_label" data-font="mono"></div>
      </div>
    `
  }

  function setup() {
    const sandbox = hero.querySelector('.hero-sandbox')
    if (sandbox) sandbox.innerHTML = ''
    
    particles = []
    
    const grid = hero.querySelector('.hero-grid')
    if (grid) {
      grid.classList.remove('hidden-scaffold')
      buildParticles(grid)
      grid.classList.add('hidden-scaffold')
    }
    
    renderFrame()
  }

  setup()
  bindCursor(hero)

  // Clock ticks (updates clock cell elements independently)
  function startClockInterval() {
    function updateClock() {
      const nowStr = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      })
      
      const clockEl = hero.querySelector('.js-clock')
      if (clockEl && clockEl.dataset.text !== nowStr) {
        clockEl.dataset.text = nowStr
        updateClockParticles(nowStr)
        if (!isRunning) startLoop()
      }
    }
    updateClock()
    clockInterval = setInterval(updateClock, 1000)
  }
  startClockInterval()

  // Handle resizing
  resizeHandler = function handleResize() {
    setup()
  }
  window.addEventListener('resize', resizeHandler)

  // Listen to active theme toggle (recompute layout & fonts)
  themeObserver = new MutationObserver(() => {
    setTimeout(() => {
      setup()
    }, 80)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
}

// ── Vite HMR Hot Disposal Hook ────────────────────────────────
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (clockInterval) clearInterval(clockInterval)
    if (resizeHandler) window.removeEventListener('resize', resizeHandler)
    if (themeObserver) themeObserver.disconnect()
    const hero = document.getElementById('hero')
    if (hero) {
      if (mouseMoveHandler) hero.removeEventListener('mousemove', mouseMoveHandler)
      if (mouseLeaveHandler) hero.removeEventListener('mouseleave', mouseLeaveHandler)
    }
    if (rafId) cancelAnimationFrame(rafId)
  })
}
