import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export function initAbout() {
  const left = document.querySelector('.about-word-left')
  const right = document.querySelector('.about-word-right')
  const photo = document.querySelector('.about-photo')

  if (left && right) {
    gsap.fromTo([left, right],
      { x: 0, opacity: 0.3 },
      {
        x: (i) => i === 0 ? '-38vw' : '38vw',
        opacity: 1,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: '.about-section',
          start: 'top 70%',
          end: 'top 20%',
          scrub: 1
        }
      }
    )
  }

  if (photo) {
    gsap.fromTo(photo,
      { scale: 1 },
      {
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: '.about-photo-wrap',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    )
  }

  // Fade in copy on scroll
  const copy = document.querySelector('.about-copy-wrap')
  if (copy) {
    gsap.fromTo(copy,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: copy,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        }
      }
    )
  }
}
