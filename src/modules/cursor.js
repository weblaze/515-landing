export function initCursor() {
  // Skip on touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return

  const ball = document.createElement('div')
  ball.className = 'cursor-ball'
  const pill = document.createElement('div')
  pill.className = 'cursor-pill'
  pill.textContent = 'View'
  document.body.append(ball, pill)

  let mx = -100, my = -100
  let px = -100, py = -100

  document.addEventListener('mousemove', e => {
    mx = e.clientX
    my = e.clientY
  })

  function tick() {
    // Ball follows cursor directly (centered on cursor)
    ball.style.transform = `translate(${mx}px, ${my}px)`

    // Pill sits beside cursor (offset to the right), follows with slight spring
    px += (mx - px) * 0.18
    py += (my - py) * 0.18
    pill.style.transform = `translate(${px + 20}px, ${py}px)`

    requestAnimationFrame(tick)
  }
  tick()

  // Activate pill over media elements
  function bindCursorViews() {
    document.querySelectorAll('[data-cursor-view]').forEach(el => {
      el.addEventListener('mouseenter', () => pill.classList.add('active'))
      el.addEventListener('mouseleave', () => pill.classList.remove('active'))
    })
  }
  bindCursorViews()

  // Re-bind after DOM mutations (e.g. manifest content injected)
  const observer = new MutationObserver(() => bindCursorViews())
  observer.observe(document.body, { childList: true, subtree: true })
}
