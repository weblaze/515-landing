export function initContact() {
  const form = document.getElementById('contact-form')
  if (!form) return

  form.addEventListener('submit', e => {
    e.preventDefault()

    const data = new FormData(form)
    const name = data.get('name')
    const brand = data.get('brand')
    const message = data.get('message')

    // Remove existing messages
    form.querySelector('.form-message')?.remove()

    if (!name || !message) {
      const msg = document.createElement('div')
      msg.className = 'form-message error'
      msg.textContent = 'Please fill in your name and message.'
      form.appendChild(msg)
      return
    }

    // Placeholder: show success message (no backend yet)
    const msg = document.createElement('div')
    msg.className = 'form-message success'
    msg.textContent = 'Message sent. We\'ll get back to you soon.'
    form.appendChild(msg)
    form.reset()

    // Auto-remove message after 5s
    setTimeout(() => msg.remove(), 5000)
  })
}
