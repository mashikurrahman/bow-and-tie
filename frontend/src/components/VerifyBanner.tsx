import { useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { useStore } from '../store/StoreContext'

// A slim reminder shown to a signed-in customer who hasn't verified their email
// yet (soft verification — they can still use the site). Dismissible per session.
export default function VerifyBanner() {
  const { user, resendVerification } = useAuth()
  const { notify } = useStore()
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!user || user.emailVerified || user.role !== 'customer' || dismissed) return null

  const resend = async () => {
    setBusy(true)
    try {
      await resendVerification()
      notify('Verification email sent — check your inbox. 📧')
    } catch {
      notify('Could not send right now — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="verify-banner">
      <span>📧 Please verify your email to secure your account and get order updates.</span>
      <span className="verify-banner-actions">
        <button type="button" onClick={resend} disabled={busy}>{busy ? 'Sending…' : 'Resend email'}</button>
        <button type="button" className="verify-banner-x" onClick={() => setDismissed(true)} aria-label="Dismiss">✕</button>
      </span>
    </div>
  )
}
