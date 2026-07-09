import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../services/db'
import { useStore } from '../store/StoreContext'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { notify } = useStore()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const invalidLink = !id || !token

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await auth.resetPassword(id, token, password)
      notify('Password updated — please sign in. 🎀')
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Choose a new password</h1>
        {invalidLink ? (
          <div className="auth-sent">
            <p>This reset link is incomplete or invalid.</p>
            <Link to="/forgot-password" className="btn btn-full">Request a new link</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>New password *</label>
              <input required type="password" minLength={4} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="field">
              <label>Confirm password *</label>
              <input required type="password" minLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn btn-full" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
