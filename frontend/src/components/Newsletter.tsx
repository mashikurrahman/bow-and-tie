import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { newsletter } from '../services/db'

export default function Newsletter() {
  const { notify } = useStore()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setBusy(true)
    try {
      const res = await newsletter.subscribe(email)
      setCode(res.code)
      setDone(true)
      setEmail('')
      notify('Thanks for subscribing! 🎀 Check your email for a welcome gift.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not subscribe')
    } finally {
      setBusy(false)
    }
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
          <p className="newsletter-success">
            You're on the list — welcome to the family! 💌
            {code && <> Use code <b>{code}</b> for 10% off your first order.</>}
          </p>
        ) : (
          <form className="newsletter-form" onSubmit={submit}>
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={busy}>{busy ? '…' : 'Subscribe'}</button>
          </form>
        )}
      </div>
    </section>
  )
}
