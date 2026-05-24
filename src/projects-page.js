// Projects page entry — projects.html
import './style/base.css'
import './style/sections/projects-page.css'
import './style/sections/footer.css'

import { initCursor } from './modules/cursor.js'
import { allProjects } from './manifest.js'

const gradients = [
  'linear-gradient(135deg, #1a1a2e, #0f3460)',
  'linear-gradient(135deg, #2d1b36, #0d0d2b)',
  'linear-gradient(135deg, #1a0f0f, #3a2020)',
  'linear-gradient(135deg, #0f1a1a, #1a3636)',
  'linear-gradient(135deg, #1a1a0f, #36361a)',
  'linear-gradient(135deg, #0f0f1a, #2a2a3a)',
  'linear-gradient(135deg, #1a0f1a, #361a36)',
  'linear-gradient(135deg, #0f1a0f, #1a361a)',
  'linear-gradient(135deg, #2a1a1a, #1a2a2a)'
]

let activeCategory = 'all'
let activeType = 'all'

function render() {
  const list = document.getElementById('projects-list')
  if (!list) return
  list.innerHTML = ''

  const filtered = allProjects.filter(p => {
    const catMatch = activeCategory === 'all' || p.category === activeCategory
    const typeMatch = activeType === 'all' || p.type === activeType
    return catMatch && typeMatch
  })

  filtered.forEach((project, i) => {
    const row = document.createElement('a')
    row.className = 'project-row'
    row.href = '#'
    row.setAttribute('data-cursor-view', '')

    const hasCover = project.cover && project.cover !== 'null'
    const gradient = gradients[i % gradients.length]

    row.innerHTML = `
      <div class="project-row-left">
        <span class="project-row-initial">${project.title[0]}</span>
        <div class="project-row-meta">
          <span class="project-row-category" data-category="${project.category}">${project.category}</span>
          <span class="project-row-year">${project.year}</span>
        </div>
      </div>
      <div class="project-row-center">
        <h2 class="project-row-title">${project.title}</h2>
        <p class="project-row-desc">${project.description}</p>
      </div>
      <div class="project-row-right">
        <div class="project-row-thumb" style="${hasCover ? '' : `background: ${gradient}`}">
          ${hasCover ? `<img src="${project.cover}" alt="${project.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : ''}
        </div>
        <span class="project-row-cta">Discover the project ↗</span>
      </div>
    `
    list.appendChild(row)
  })
}

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

// Theme switcher logic
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  function updateButtonAndLabels(theme) {
    if (theme === 'instrument') {
      toggleBtn.textContent = '[ MODE: INSTRUMENT ]';
    } else if (theme === 'brutalist') {
      toggleBtn.textContent = '[ MODE: BRUTALIST ]';
    } else if (theme === 'retro') {
      toggleBtn.textContent = '[ MODE: RETRO OS ]';
    } else {
      toggleBtn.textContent = '[ MODE: STANDARD ]';
    }

    const title = document.querySelector('.projects-page-title');
    if (title) {
      if (theme === 'instrument') {
        title.textContent = 'ALL_WORK';
      } else if (theme === 'brutalist') {
        title.textContent = 'SPECIFICATION LIST';
      } else if (theme === 'retro') {
        title.textContent = 'FILE_INDEX.SYS';
      } else {
        title.textContent = 'All Work';
      }
    }
  }

  let currentTheme = 'standard';
  if (document.documentElement.classList.contains('theme-instrument')) {
    currentTheme = 'instrument';
  } else if (document.documentElement.classList.contains('theme-brutalist')) {
    currentTheme = 'brutalist';
  } else if (document.documentElement.classList.contains('theme-retro')) {
    currentTheme = 'retro';
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
      nextTheme = 'standard';
    }
    
    document.documentElement.classList.remove('theme-instrument', 'theme-brutalist', 'theme-retro');
    if (nextTheme === 'instrument') {
      document.documentElement.classList.add('theme-instrument');
    } else if (nextTheme === 'brutalist') {
      document.documentElement.classList.add('theme-brutalist');
    } else if (nextTheme === 'retro') {
      document.documentElement.classList.add('theme-retro');
    }
    
    currentTheme = nextTheme;
    localStorage.setItem('theme', currentTheme);
    updateButtonAndLabels(currentTheme);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  startClock()
  initThemeToggle()
  initCursor()

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
})

