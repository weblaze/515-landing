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
import { initHeroV3 } from './modules/hero-v3.js'
// import { initLegacyHero } from './modules/hero-legacy.js' // ← legacy
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

// Heading animations for Instrument/Poster theme
function initHeadingAnimations(theme) {
  const elements = document.querySelectorAll('.theme-display-heading, .hero-center-title h1');
  elements.forEach(el => {
    gsap.killTweensOf(el);
    if (theme === 'instrument') {
      gsap.fromTo(el, 
        {
          y: '80%',
          clipPath: 'inset(0 0 100% 0)'
        },
        {
          y: '0%',
          clipPath: 'inset(0 0 0% 0)',
          duration: 0.5,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none'
          }
        }
      );
    } else if (theme === 'poster') {
      gsap.fromTo(el, 
        {
          x: '-100%',
          clipPath: 'inset(0 100% 0 0)'
        },
        {
          x: '0%',
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.35,
          ease: 'power4.inOut',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none none'
          }
        }
      );
    } else {
      gsap.set(el, { clearProps: 'all' });
    }
  });
}

// Theme switcher logic
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  let retroScrollTriggers = [];
  let posterNavTriggers = [];

  function initRetroWindowTriggers(theme) {
    retroScrollTriggers.forEach(st => st.kill());
    retroScrollTriggers = [];

    const windows = document.querySelectorAll('#highlight, #services, #about, .projects-section');
    if (theme === 'retro') {
      windows.forEach(win => {
        const st = ScrollTrigger.create({
          trigger: win,
          start: 'top 85%',
          onEnter: () => win.classList.add('window-open'),
          onLeaveBack: () => win.classList.remove('window-open')
        });
        retroScrollTriggers.push(st);

        // Run check in case it's already visible in viewport
        if (win.getBoundingClientRect().top < window.innerHeight * 0.85) {
          win.classList.add('window-open');
        }
      });
    } else {
      windows.forEach(win => win.classList.remove('window-open'));
    }
  }

  function initPosterNavTriggers(theme) {
    posterNavTriggers.forEach(st => st.kill());
    posterNavTriggers = [];

    const nav = document.querySelector('.nav');
    if (!nav) return;

    if (theme === 'poster') {
      const sections = [
        { id: '#hero', color: 'white' },
        { id: '#highlight', color: 'black' },
        { id: '#services', color: 'white' },
        { id: '.perks-section', color: 'black' },
        { id: '#about', color: 'black' },
        { id: '.projects-section', color: 'black' },
        { id: '#contact', color: 'white' }
      ];

      sections.forEach(sec => {
        const el = document.querySelector(sec.id);
        if (!el) return;

        const st = ScrollTrigger.create({
          trigger: el,
          start: 'top 56px',
          end: 'bottom 56px',
          onToggle: (self) => {
            if (self.isActive) {
              nav.setAttribute('data-poster-color', sec.color);
            }
          },
          onEnter: () => nav.setAttribute('data-poster-color', sec.color),
          onEnterBack: () => nav.setAttribute('data-poster-color', sec.color)
        });
        posterNavTriggers.push(st);
      });
    } else {
      nav.removeAttribute('data-poster-color');
    }
  }

  function updateButtonAndLabels(theme) {
    if (theme === 'instrument') {
      toggleBtn.textContent = '[ MODE: INSTRUMENT ]';
    } else if (theme === 'brutalist') {
      toggleBtn.textContent = '[ MODE: BRUTALIST ]';
    } else if (theme === 'retro') {
      toggleBtn.textContent = '[ MODE: RETRO OS ]';
    } else if (theme === 'poster') {
      toggleBtn.textContent = '[ MODE: POSTER SYSTEM ]';
    } else {
      toggleBtn.textContent = '[ MODE: STANDARD ]';
    }
    
    // Dynamic section labels styling
    const labels = document.querySelectorAll('.section-label');
    const sectionNumbers = {
      'Selected Work': '01',
      'What We Do': '02',
      'Why Us': '03',
      'All Projects': '04',
      'Get In Touch': '05'
    };
    
    labels.forEach(label => {
      if (!label.hasAttribute('data-original-text')) {
        label.setAttribute('data-original-text', label.textContent);
      }
      const original = label.getAttribute('data-original-text');
      const cleanText = original.replace(/[\[\]]/g, '').trim();
      
      if (theme === 'instrument') {
        const num = sectionNumbers[cleanText] || '01';
        label.innerHTML = `<span class="section-marker"></span><span class="section-num">[${num}]</span><span class="section-text">${cleanText.toUpperCase().replace(/\s+/g, '_')}</span>`;
      } else if (theme === 'brutalist' || theme === 'poster') {
        label.textContent = cleanText.toUpperCase();
      } else if (theme === 'retro') {
        label.textContent = `[${cleanText}]`;
      } else {
        label.textContent = original;
      }
    });

    // Dynamic tagline styling
    const tagline = document.querySelector('.hero-tagline');
    if (tagline) {
      if (theme === 'instrument') {
        tagline.textContent = 'CREATIVE AGENCY_ THREE PEOPLE';
      } else if (theme === 'brutalist') {
        tagline.textContent = '515 HOUSE SPEC SHEET // CREATIVE AGENCY // 3P';
      } else if (theme === 'retro') {
        tagline.textContent = 'SYSTEM ACTIVE: 3P_CORE_AGENCY';
      } else if (theme === 'poster') {
        tagline.textContent = 'CREATIVE AGENCY / THREE PEOPLE';
      } else {
        tagline.textContent = 'Creative agency. Three people.';
      }
    }

    // Dynamic about section words styling
    const aboutLeft = document.querySelector('.about-word-left');
    const aboutRight = document.querySelector('.about-word-right');
    if (aboutLeft && aboutRight) {
      if (theme === 'instrument') {
        aboutLeft.textContent = 'THREE_';
        aboutRight.textContent = 'PEOPLE';
      } else if (theme === 'brutalist') {
        aboutLeft.textContent = '3_STAFF';
        aboutRight.textContent = '01_TEAM';
      } else if (theme === 'retro') {
        aboutLeft.textContent = 'SYS_01';
        aboutRight.textContent = 'SYS_02';
      } else if (theme === 'poster') {
        aboutLeft.textContent = 'THREE';
        aboutRight.textContent = 'PEOPLE';
      } else {
        aboutLeft.textContent = 'THREE';
        aboutRight.textContent = 'PEOPLE';
      }
    }

    // Dynamic services labels styling
    const serviceLabels = document.querySelectorAll('.service-col-label');
    const retroServiceNames = {
      'Film': 'FILM.EXE',
      'Design': 'DESIGN.SYS',
      'Events': 'EVENTS.BAT',
      'Food': 'FOOD.COM',
      'Digital': 'DIGITAL.BIN'
    };
    serviceLabels.forEach(lbl => {
      const standard = lbl.getAttribute('data-standard');
      const instrument = lbl.getAttribute('data-instrument');
      if (theme === 'instrument') {
        lbl.textContent = instrument;
      } else if (theme === 'brutalist') {
        lbl.textContent = standard.toUpperCase() + ' SPEC';
      } else if (theme === 'retro') {
        lbl.textContent = retroServiceNames[standard] || standard.toUpperCase();
      } else if (theme === 'poster') {
        lbl.textContent = standard.toUpperCase();
      } else {
        lbl.textContent = standard;
      }
    });

    // Dynamic submit button label
    const submitBtn = document.querySelector('.form-submit');
    if (submitBtn) {
      if (theme === 'poster') {
        submitBtn.textContent = 'Send it →';
      } else {
        submitBtn.textContent = 'Send it';
      }
    }

    // Trigger GSAP display heading animations
    initHeadingAnimations(theme);
    // Initialize viewport triggers for retro windows
    initRetroWindowTriggers(theme);
    // Initialize scrollTriggers for poster navigation transparent mode
    initPosterNavTriggers(theme);
  }

  // Initialize button state
  let currentTheme = 'standard';
  if (document.documentElement.classList.contains('theme-instrument')) {
    currentTheme = 'instrument';
  } else if (document.documentElement.classList.contains('theme-brutalist')) {
    currentTheme = 'brutalist';
  } else if (document.documentElement.classList.contains('theme-retro')) {
    currentTheme = 'retro';
  } else if (document.documentElement.classList.contains('theme-poster')) {
    currentTheme = 'poster';
  }
  updateButtonAndLabels(currentTheme);

  toggleBtn.addEventListener('click', () => {
    let nextTheme = 'standard';
    if (currentTheme === 'standard') {
      nextTheme = 'instrument';
    } else if (currentTheme === 'instrument') {
      nextTheme = 'brutalist';
    } else if (currentTheme === 'brutalist') {
      nextTheme = 'retro';
    } else if (currentTheme === 'retro') {
      nextTheme = 'poster';
    } else if (currentTheme === 'poster') {
      nextTheme = 'standard';
    }
    
    document.documentElement.classList.remove('theme-instrument', 'theme-brutalist', 'theme-retro', 'theme-poster');
    if (nextTheme === 'instrument') {
      document.documentElement.classList.add('theme-instrument');
    } else if (nextTheme === 'brutalist') {
      document.documentElement.classList.add('theme-brutalist');
    } else if (nextTheme === 'retro') {
      document.documentElement.classList.add('theme-retro');
    } else if (nextTheme === 'poster') {
      document.documentElement.classList.add('theme-poster');
    }
    
    currentTheme = nextTheme;
    localStorage.setItem('theme', currentTheme);
    updateButtonAndLabels(currentTheme);
    
    // Refresh ScrollTrigger to accommodate layout adjustment/font changes
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  });
}


// Init everything
document.addEventListener('DOMContentLoaded', () => {
  startClock()
  initThemeToggle()
  initCursor()

  try {
    initHeroV3()
    // initLegacyHero() // ← legacy
  } catch (e) {
    console.warn('Hero init failed:', e)
  }

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
