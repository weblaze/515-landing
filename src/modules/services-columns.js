const services = [
  {
    id: 'photo-film',
    label: 'Film',
    instrumentLabel: 'PHOTO_FILM',
    capacity: 85,
    description: 'Stills and motion. Editorial, commercial, events. We make your subject look like it belongs on a billboard.',
    image: '/content/services/photo.webp'
  },
  {
    id: 'design-brand',
    label: 'Design',
    instrumentLabel: 'DESIGN_BRAND',
    capacity: 95,
    description: 'Identity systems, print, digital. From logo to full brand guideline — consistent, sharp, memorable.',
    image: '/content/services/design.webp'
  },
  {
    id: 'events',
    label: 'Events',
    instrumentLabel: 'EVENTS_AFTERMOVIES',
    capacity: 70,
    description: 'Concert coverage, venue documentation, recap films. We capture the energy, not just the stage.',
    image: '/content/services/events.webp'
  },
  {
    id: 'fnb-hosp',
    label: 'Food',
    instrumentLabel: 'FNB_HOSPITALITY',
    capacity: 80,
    description: 'Menu shoots, ambiance, brand story. We make your space look as good as it feels.',
    image: '/content/services/fnb.webp'
  },
  {
    id: 'uiux',
    label: 'Digital',
    instrumentLabel: 'UIUX_DIGITAL',
    capacity: 90,
    description: 'Product design, interfaces, web. Digital experiences that feel intuitive and look premium.',
    image: '/content/services/uiux.webp'
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
    col.className = `service-col service-col-${svc.id}`
    col.innerHTML = `
      <div class="service-col-edge-highlight"></div>
      <span class="service-col-num">${i + 1}</span>
      <div class="service-col-media">
        <img src="${svc.image}" alt="${svc.label}" loading="lazy">
      </div>
      <div class="service-col-content">
        <span class="service-col-label" data-standard="${svc.label}" data-instrument="${svc.instrumentLabel}">${svc.label}</span>
        <div class="service-progress-bar" aria-hidden="true">
          <div class="service-progress-fill" style="width: ${svc.capacity}%;"></div>
        </div>
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
