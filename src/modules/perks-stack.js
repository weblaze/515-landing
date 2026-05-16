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
    const wrapperDiv = document.createElement('div')
    wrapperDiv.className = 'perk-card-wrapper'
    // Ensure the wrapper preserves layout when the card inside becomes position: fixed
    wrapperDiv.style.position = 'relative'

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
    wrapperDiv.appendChild(card)
    wrapper.appendChild(wrapperDiv)
  })

  const allCards = gsap.utils.toArray('.perk-card')
  if (allCards.length === 0) return

  const totalCards = allCards.length
  const offsetStep = 40 // 40px exposed top edge per card
  const maxOffset = (totalCards - 1) * offsetStep

  // Set up the container for absolute positioning stacking
  wrapper.style.position = 'relative'
  // Calculate total height needed. Cards are ~300px min-height. Let's force them to overlap at bottom.
  // The easiest way is to let GSAP handle the initial layout, but to stack them we can just set them absolute.
  const cardHeight = allCards[0].offsetHeight || 300
  wrapper.style.height = `${cardHeight + maxOffset}px`

  allCards.forEach((card, i) => {
    card.style.position = 'absolute'
    card.style.top = '0'
    card.style.left = '0'
    card.style.width = '100%'
    card.style.zIndex = i
    // Initial position: Card 0 is at 0, Card 1 is at 100vh (offscreen bottom), etc.
    if (i > 0) {
      gsap.set(card, { y: window.innerHeight })
    }
  })

  // We pin the wrapper. We scrub an animation that slides them up.
  // How long to scrub? 100vh per card, plus a pack duration.
  const scrollPerCard = window.innerHeight * 0.8
  const packDuration = 600
  const totalScroll = (totalCards - 1) * scrollPerCard + packDuration

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: 'center center', // Pin when Card 0 is exactly in center
      end: `+=${totalScroll}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1
    }
  })

  // 1. Stacking Phase
  // Slide each card up from window.innerHeight to its stacked position (i * offsetStep)
  for (let i = 1; i < totalCards; i++) {
    tl.to(allCards[i], {
      y: i * offsetStep,
      duration: scrollPerCard,
      ease: 'none'
    }, (i - 1) * scrollPerCard) // Start when previous card finishes
  }

  // 2. Packing Phase
  // After all cards are stacked, move Card 0...N-1 down to hide behind the CTA card
  const packStartTime = (totalCards - 1) * scrollPerCard
  allCards.forEach((card, i) => {
    if (i === totalCards - 1) return // Skip CTA
    const currentOffset = i * offsetStep
    const distToMove = maxOffset - currentOffset

    tl.to(card, {
      y: `+=${distToMove}`,
      opacity: 0,
      scale: 0.96,
      duration: packDuration,
      ease: 'power2.inOut'
    }, packStartTime)
  })

  // CTA hover — smooth slide from right-aligned to centered
  const ctaCard = allCards[totalCards - 1]
  const ctaText = ctaCard?.querySelector('.perk-cta-text')
  if (ctaCard && ctaText) {
    ctaCard.addEventListener('mouseenter', () => {
      const cardWidth = ctaCard.clientWidth
      const textWidth = ctaText.offsetWidth
      const padding = 56
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
}
