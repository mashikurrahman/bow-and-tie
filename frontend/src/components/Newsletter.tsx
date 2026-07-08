import { useState } from 'react'
import { useStore } from '../store/StoreContext'

export default function Newsletter() {
  const { notify } = useStore()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    // Persist locally so nothing is lost; swap for a real API/Mailchimp later.
    const list = JSON.parse(localStorage.getItem('bc_newsletter') || '[]') as string[]
    if (!list.includes(email)) list.push(email)
    localStorage.setItem('bc_newsletter', JSON.stringify(list))
    setDone(true)
    setEmail('')
    notify('Thanks for subscribing! 🎀')
  }

  return (
    <section id="newsletter">
      <div className="newsletter">
        <h2>Stay in the Loop</h2>
        <p>
          Subscribe to get updates on new collections, seasonal discounts, and custom order
          availability.
        </p>
        {done ? (
          <p className="newsletter-success">You're on the list — welcome to the family! 💌</p>
        ) : (
          <form className="newsletter-form" onSubmit={submit}>
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">Subscribe</button>
          </form>
        )}
      </div>
    </section>
  )
}
