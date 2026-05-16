import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

const perks = [
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

export function initPerks() {
  const section = document.querySelector('.perks-section')
  if (!section) return

  const wrapper = section.querySelector('.perks-cards')
  if (!wrapper) return

  // Build cards
  perks.forEach((perk, i) => {
    const card = document.createElement('div')
    if (perk.type === 'cta') {
      card.className = 'perk-card perk-card-cta'
      card.innerHTML = `<span class="perk-cta-text">${perk.heading}</span>`
    } else {
      card.className = 'perk-card'
      card.innerHTML = `
        <span class="perk-number">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="perk-heading">${perk.heading}</h3>
        <p class="perk-body">${perk.body}</p>
      `
    }
    wrapper.appendChild(card)
  })

  // GSAP ScrollTrigger stacking — content cards
  const contentCards = gsap.utils.toArray('.perk-card:not(.perk-card-cta)')
  const ctaCard = document.querySelector('.perk-card-cta')

  contentCards.forEach((card, i) => {
    ScrollTrigger.create({
      trigger: card,
      start: `top ${80 - i * 4}px`,
      pin: true,
      pinSpacing: false,
      endTrigger: '.perks-section',
      end: 'bottom bottom'
    })

    gsap.to(card, {
      scale: 1 - (contentCards.length - 1 - i) * 0.02,
      scrollTrigger: {
        trigger: card,
        start: 'top top',
        scrub: true
      }
    })
  })

  // CTA card — scrolls up, covers the deck, holds pinned with spacing
  if (ctaCard) {
    ScrollTrigger.create({
      trigger: ctaCard,
      start: `top ${80 - contentCards.length * 4}px`,
      pin: true,
      pinSpacing: true,
      endTrigger: '.perks-section',
      end: 'bottom bottom'
    })
  }

  // CTA hover — smooth slide from right-aligned to centered using GSAP x transform
  const ctaText = ctaCard?.querySelector('.perk-cta-text')
  if (!ctaCard || !ctaText) return

  // The text starts right-aligned via CSS. On hover, we compute the distance
  // to center and tween it smoothly.
  ctaCard.addEventListener('mouseenter', () => {
    const cardWidth = ctaCard.clientWidth
    const textWidth = ctaText.offsetWidth
    const padding = 56
    // Text is right-aligned at: cardWidth - padding - textWidth (left edge)
    // Center position left edge: (cardWidth - textWidth) / 2
    // Offset needed: center - right = (cardWidth - textWidth)/2 - (cardWidth - padding - textWidth)
    // = (cardWidth - textWidth)/2 - cardWidth + padding + textWidth
    // = -cardWidth/2 + textWidth/2 + padding + textWidth
    // Simplified: we just move it left by the difference
    const rightPos = cardWidth - padding - textWidth
    const centerPos = (cardWidth - textWidth) / 2
    const offset = centerPos - rightPos

    gsap.to(ctaText, {
      x: offset,
      duration: 0.8,
      ease: 'power3.out'
    })
  })

  ctaCard.addEventListener('mouseleave', () => {
    gsap.to(ctaText, {
      x: 0,
      duration: 0.8,
      ease: 'power3.out'
    })
  })

  ctaCard.addEventListener('click', () => {
    const contact = document.getElementById('contact')
    if (contact) {
      gsap.to(window, {
        scrollTo: { y: contact, offsetY: 56 },
        duration: 1.2,
        ease: 'power4.inOut'
      })
    }
  })
}
