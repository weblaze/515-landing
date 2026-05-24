import '../style/sections/hero-pretext.css'
import { prepareWithSegments, layoutWithLines, layoutNextLine } from '@chenglou/pretext'

const CURSOR_RADIUS = 80 // px — exclusion zone radius
const CELLS = []         // populated on init
let lastCursorPos = null  // store last cursor viewport coordinates

// Helper to resolve CSS variables to actual font-family strings
function getResolvedFontFamily(varName) {
  const cleanVar = varName.replace(/var\(|\)/g, '').trim();
  const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(cleanVar).trim();
  return resolved || 'sans-serif';
}

// Unified layoutText helper utilizing Pretext API
function layoutText(options) {
  const {
    text,
    width,
    height,
    fontSize,
    fontFamily,
    lineHeight,
    letterSpacing,
    fitMode,
    lineWidthOverrides
  } = options;
  
  // Resolve font-family variable (e.g. var(--font-display))
  let resolvedFontFamily = fontFamily;
  if (fontFamily.startsWith('var(')) {
    resolvedFontFamily = getResolvedFontFamily(fontFamily);
  }
  
  let currentFontSize = fontSize;
  let finalLines = [];
  let finalFontSize = fontSize;
  
  // Shrink loop to fit both dimensions
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
    if (lineWidthOverrides && lineWidthOverrides.length > 0) {
      // Loop utilizing layoutNextLine for variable width line formatting
      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      let lineIndex = 0;
      while (cursor) {
        const override = lineWidthOverrides.find(o => o.lineIndex === lineIndex);
        const availableWidth = override ? override.availableWidth : width;
        const indent = override ? (override.indent || 0) : 0;
        
        let line = null;
        try {
          line = layoutNextLine(prepared, cursor, availableWidth);
        } catch (e) {
          console.warn("Pretext layoutNextLine failed:", e);
          break;
        }
        
        if (!line) break;
        
        tempLines.push({
          text: line.text,
          width: line.width,
          x: indent,
          y: lineIndex * approxLineHeight
        });
        
        cursor = line.end;
        lineIndex++;
      }
    } else {
      // Standard layout with lines
      let layoutRes;
      try {
        layoutRes = layoutWithLines(prepared, width, lineHeight);
      } catch (e) {
        console.warn("Pretext layoutWithLines failed:", e);
        break;
      }
      tempLines = layoutRes.lines.map((line, idx) => {
        return {
          text: line.text,
          width: line.width,
          x: 0,
          y: idx * approxLineHeight
        };
      });
    }
    
    const totalHeight = tempLines.length * approxLineHeight;
    
    let fits = true;
    if (fitMode === 'shrink') {
      if (totalHeight > height) {
        fits = false;
      }
      for (const line of tempLines) {
        const idx = tempLines.indexOf(line);
        const override = lineWidthOverrides ? lineWidthOverrides.find(o => o.lineIndex === idx) : null;
        const limitWidth = override ? override.availableWidth : width;
        
        if (line.width > limitWidth) {
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

export function initPretextHero() {
  const hero = document.getElementById('hero')
  if (!hero) return

  // Inject pretext HTML grid if not already present
  if (!hero.querySelector('.hero-grid')) {
    hero.className = 'hero-pretext'
    hero.innerHTML = `
      <div class="hero-grid">
        <div class="hero-cell span-4-3" data-text="515" data-font="display" data-size="160"></div>
        <div class="hero-cell span-4-2" data-text="HOUSE" data-font="display" data-size="160"></div>
        <div class="hero-cell span-4-2" data-text="Creative Agency" data-font="mono" data-size="14"></div>
        <div class="hero-cell span-3-1" data-text="Three People" data-font="display" data-size="24"></div>
        <div class="hero-cell span-5-1" data-text="Est. 2024" data-font="mono" data-size="14"></div>
        <div class="hero-cell span-6-3" data-text="PHOTO_FILM" data-font="display" data-size="96"></div>
        <div class="hero-cell span-6-2" data-text="DESIGN_BRAND" data-font="display" data-size="72"></div>
        <div class="hero-cell span-3-1" data-text="EVENTS" data-font="display" data-size="48"></div>
        <div class="hero-cell span-3-1" data-text="UI_UX" data-font="display" data-size="48"></div>
        <div class="hero-divider"></div>
        <div class="hero-cell span-4-1" data-text="Gurugram, IN" data-font="mono" data-size="12"></div>
        <div class="hero-cell span-4-1 js-clock" data-text="00:00:00" data-font="mono" data-size="12"></div>
        <div class="hero-cell span-4-1" data-text="↓ Scroll" data-font="mono" data-size="12"></div>
      </div>
    `
  }

  const grid = hero.querySelector('.hero-grid')
  const cellEls = grid.querySelectorAll('.hero-cell[data-text]')

  // Clear previous measurements
  CELLS.length = 0

  // One-time initial dimensions measurement
  cellEls.forEach(el => {
    const rect = el.getBoundingClientRect()
    CELLS.push({
      el,
      text: el.dataset.text,
      font: el.dataset.font || 'display', // 'display' | 'mono'
      baseSize: parseFloat(el.dataset.size) || 48,
      rect
    })
  })

  // Initial layout with no cursor influence
  CELLS.forEach(cell => layoutCell(cell, null))

  // Cursor tracking variables
  let cursorX = -999, cursorY = -999
  let rafPending = false

  hero.addEventListener('mousemove', e => {
    cursorX = e.clientX
    cursorY = e.clientY
    lastCursorPos = { x: cursorX, y: cursorY }
    
    if (!rafPending) {
      rafPending = true
      requestAnimationFrame(() => {
        CELLS.forEach(cell => layoutCell(cell, lastCursorPos))
        rafPending = false
      })
    }
  })

  hero.addEventListener('mouseleave', () => {
    lastCursorPos = null
    CELLS.forEach(cell => layoutCell(cell, null))
  })

  // Update Gurugram Clock Live
  const clockEl = grid.querySelector('.js-clock')
  if (clockEl) {
    function updateClock() {
      const nowStr = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      })
      
      const cellObj = CELLS.find(c => c.el === clockEl)
      if (cellObj && cellObj.text !== nowStr) {
        cellObj.text = nowStr
        clockEl.dataset.text = nowStr
        layoutCell(cellObj, lastCursorPos)
      }
    }
    updateClock()
    setInterval(updateClock, 1000)
  }

  // Handle Window Resize (re-cache cell rectangles)
  function handleResize() {
    CELLS.forEach(cell => {
      cell.rect = cell.el.getBoundingClientRect()
    })
    CELLS.forEach(cell => layoutCell(cell, lastCursorPos))
  }
  window.addEventListener('resize', handleResize)

  // Listen to active theme toggle (re-lay out with refreshed styles/fonts)
  const themeObserver = new MutationObserver(() => {
    // Wait briefly for style sheet transitions
    setTimeout(() => {
      handleResize()
    }, 50)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
}

function layoutCell(cell, cursor) {
  const { el, text, baseSize, rect } = cell

  // Compute available width at each line considering cursor exclusion
  let availableWidth = rect.width
  let cursorInfluence = 0
  let lineWidths = null

  if (cursor) {
    // Check if cursor is physically inside the cell's bounding box
    if (
      cursor.x > rect.left && cursor.x < rect.right &&
      cursor.y > rect.top  && cursor.y < rect.bottom
    ) {
      const localX = cursor.x - rect.left
      const localY = cursor.y - rect.top

      // Build per-line width constraints
      lineWidths = []
      const approxLineHeight = baseSize * 0.92
      const lineCount = Math.ceil(rect.height / approxLineHeight)

      for (let i = 0; i < lineCount; i++) {
        const lineY = i * approxLineHeight
        const distToLine = Math.abs(lineY - localY)
        if (distToLine < CURSOR_RADIUS) {
          // Chord width of circle at this line's y position
          const chord = Math.sqrt(
            Math.max(0, CURSOR_RADIUS * CURSOR_RADIUS - distToLine * distToLine)
          )
          const indent = chord * 2
          
          lineWidths.push({
            lineIndex: i,
            availableWidth: rect.width - indent,
            indent: localX < rect.width / 2 ? indent : 0 // indent from left or right
          })
        }
      }
    } else {
      // Distance from cursor to cell center
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = cursor.x - cx
      const dy = cursor.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Influence falls off beyond CURSOR_RADIUS * 3
      const maxInfluenceDist = CURSOR_RADIUS * 3
      if (dist < maxInfluenceDist) {
        cursorInfluence = (1 - dist / maxInfluenceDist)
        // Mute influence to 35% compression maximum
        availableWidth = rect.width * (1 - cursorInfluence * 0.35)
      }
    }
  }

  // Pretext rendering calculations
  const result = layoutText({
    text,
    width: availableWidth,
    height: rect.height,
    fontSize: baseSize,
    fontFamily: cell.font === 'display' ? 'var(--font-display)' : 'var(--font-body)',
    lineHeight: 0.92,
    letterSpacing: -0.015,
    fitMode: 'shrink',
    lineWidthOverrides: lineWidths
  })

  // Render lines as positioned spans
  el.innerHTML = ''
  result.lines.forEach((line) => {
    const span = document.createElement('span')
    span.className = 'hero-line'
    span.textContent = line.text
    span.style.fontSize = result.fontSize + 'px'
    span.style.top = line.y + 'px'
    span.style.left = line.x + 'px'
    el.appendChild(span)
  })
}
