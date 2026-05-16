import { allProjects } from '../manifest.js'

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

// Random heights for masonry visual interest
const heights = [200, 280, 220, 300, 240, 260, 180, 320, 250]

export function initProjectsMasonry() {
  const grid = document.querySelector('.masonry-grid')
  if (!grid) return

  const MAX_PREVIEW = 9

  allProjects.slice(0, MAX_PREVIEW).forEach((project, i) => {
    const item = document.createElement('div')
    item.className = 'masonry-item'
    item.setAttribute('data-cursor-view', '')

    const hasCover = project.cover && project.cover !== 'null'
    const gradient = gradients[i % gradients.length]
    const height = heights[i % heights.length]

    item.innerHTML = `
      <div class="masonry-media" style="${!hasCover ? `background: ${gradient}; height: ${height}px;` : ''}">
        ${hasCover
          ? `<img src="${project.cover}" alt="${project.title}" loading="lazy">`
          : ''
        }
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
