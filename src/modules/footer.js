import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export function initFooter() {
  const footer = document.querySelector('.footer')
  if (!footer) return

  // Animate footer statement in
  const statement = footer.querySelector('.footer-statement')
  if (statement) {
    gsap.fromTo(statement,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footer,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      }
    )
  }

  // Update copyright year
  const copyEl = footer.querySelector('.footer-copy')
  if (copyEl) {
    copyEl.textContent = `© ${new Date().getFullYear()}`
  }
}
