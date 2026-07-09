import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../services/db'
import { usePageMeta } from '../hooks/usePageMeta'

export default function ForgotPasswordPage() {
  usePageMeta({ title: 'Forgot Password', noindex: true })
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await auth.forgotPassword(email)
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Reset your password</h1>
        {sent ? (
          <div className="auth-sent">
            <div className="auth-sent-icon">📧</div>
            <p>
              If an account exists for <b>{email}</b>, we’ve sent a link to reset your password. Please
              check your inbox (and spam folder).
            </p>
            <Link to="/login" className="btn btn-full">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="auth-lead">Enter your email and we’ll send you a link to set a new password.</p>
            <div className="field">
              <label>Email *</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <button type="submit" className="btn btn-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="auth-alt"><Link to="/login">Back to sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}
