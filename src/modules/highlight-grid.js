import { highlightProjects } from '../manifest.js'

// Gradient color sets for placeholder cards
const gradients = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #2d1b36 0%, #1e1233 50%, #0d0d2b 100%)',
  'linear-gradient(135deg, #1a0f0f 0%, #2a1a1a 50%, #3a2020 100%)',
  'linear-gradient(135deg, #0f1a1a 0%, #122626 50%, #1a3636 100%)',
  'linear-gradient(135deg, #1a1a0f 0%, #262612 50%, #36361a 100%)'
]

export function initHighlight() {
  const grid = document.querySelector('.highlight-grid')
  if (!grid) return

  highlightProjects.forEach((project, i) => {
    const card = document.createElement('div')
    card.className = `highlight-card ${i % 3 === 2 ? 'full' : 'half'}`
    card.setAttribute('data-cursor-view', '')

    const hasCover = project.cover && project.cover !== 'null'
    const gradient = gradients[i % gradients.length]

    card.innerHTML = `
      <div class="highlight-card-media" style="${!hasCover ? `background: ${gradient}` : ''}">
        ${hasCover
          ? `<img src="${project.cover}" alt="${project.title}" loading="lazy">`
          : `<span class="placeholder-label">${project.title}</span>`
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
