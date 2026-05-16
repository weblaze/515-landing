// Main entry — index.html
import './style/base.css'
import './style/sections/hero.css'
import './style/sections/highlight.css'
import './style/sections/services.css'
import './style/sections/perks.css'
import './style/sections/about.css'
import './style/sections/projects-page.css'
import './style/sections/contact.css'
import './style/sections/footer.css'

import { initCursor } from './modules/cursor.js'
import { initHeroWebGL } from './modules/hero-webgl.js'
import { initHighlight } from './modules/highlight-grid.js'
import { initServices } from './modules/services-columns.js'
import { initPerks } from './modules/perks-stack.js'
import { initAbout } from './modules/about-split.js'
import { initProjectsMasonry } from './modules/projects-masonry.js'
import { initContact } from './modules/contact.js'
import { initFooter } from './modules/footer.js'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// Nav clock
function startClock() {
  const el = document.getElementById('nav-time')
  if (!el) return
  function update() {
    el.textContent = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }
  update()
  setInterval(update, 1000)
}

// Init everything
document.addEventListener('DOMContentLoaded', () => {
  startClock()
  initCursor()

  try { initHeroWebGL() } catch (e) { console.warn('WebGL init failed:', e) }

  initHighlight()
  initServices()
  initPerks()
  initAbout()
  initProjectsMasonry()
  initContact()
  initFooter()

  // Refresh ScrollTrigger after all DOM mutations
  ScrollTrigger.refresh()

  // Scroll anchoring
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
})
