const services = [
  {
    id: 'photo-film',
    label: 'Film',
    description: 'Stills and motion. Editorial, commercial, events. We make your subject look like it belongs on a billboard.',
    image: '/content/services/photo.jpg'
  },
  {
    id: 'design-brand',
    label: 'Design',
    description: 'Identity systems, print, digital. From logo to full brand guideline — consistent, sharp, memorable.',
    image: '/content/services/design.jpg'
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Concert coverage, venue documentation, recap films. We capture the energy, not just the stage.',
    image: '/content/services/events.jpg'
  },
  {
    id: 'fnb-hosp',
    label: 'Food',
    description: 'Menu shoots, ambiance, brand story. We make your space look as good as it feels.',
    image: '/content/services/fnb.jpg'
  },
  {
    id: 'uiux',
    label: 'Digital',
    description: 'Product design, interfaces, web. Digital experiences that feel intuitive and look premium.',
    image: '/content/services/uiux.jpg'
  }
]

export function initServices() {
  const section = document.getElementById('services')
  if (!section) return

  const container = section.querySelector('.services-columns')
  if (!container) return

  // Build columns
  services.forEach((svc, i) => {
    const col = document.createElement('div')
    col.className = 'service-col'
    col.innerHTML = `
      <div class="service-col-edge-highlight"></div>
      <span class="service-col-num">${i + 1}</span>
      <div class="service-col-media">
        <img src="${svc.image}" alt="${svc.label}" loading="lazy">
      </div>
      <div class="service-col-content">
        <span class="service-col-label">${svc.label}</span>
        <p class="service-col-desc">${svc.description}</p>
      </div>
    `
    container.appendChild(col)
  })

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
