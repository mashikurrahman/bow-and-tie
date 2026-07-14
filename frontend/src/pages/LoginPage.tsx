import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useStore } from '../store/StoreContext'
import SocialLogin from '../components/SocialLogin'
import { usePageMeta } from '../hooks/usePageMeta'

export default function LoginPage() {
  usePageMeta({ title: 'Sign In', noindex: true })
  const { login, register } = useAuth()
  const { notify } = useStore()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const redirectTo = location.state?.from ?? '/account'

  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') ?? ''
  const [mode, setMode] = useState<'login' | 'register'>(refCode ? 'register' : 'login')
  const [form, setForm] = useState({ name: '', email: '', password: '', referralCode: refCode })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        notify('Welcome back! 🎀')
      } else {
        await register(form)
        notify('Account created! 📧 Check your email to verify your address.')
      }
      navigate(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page narrow auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>
            Sign In
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>
            Create Account
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label>Full Name *</label>
              <input required value={form.name} onChange={set('name')} placeholder="Your name" />
            </div>
          )}
          <div className="field">
            <label>Email *</label>
            <input required type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
          </div>
          <div className="field">
            <label>Password *</label>
            <input required type="password" minLength={4} value={form.password} onChange={set('password')} placeholder="••••••••" />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Referral code <span className="admin-muted">(optional)</span></label>
              <input value={form.referralCode} onChange={set('referralCode')} placeholder="A friend's code — you both get points" />
            </div>
          )}

          {mode === 'login' && (
            <p className="auth-forgot">
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <SocialLogin redirectTo={redirectTo} />

        <p className="auth-alt">
          {mode === 'login' ? (
            <>New here? <button className="link-btn" onClick={() => setMode('register')}>Create an account</button></>
          ) : (
            <>Already have an account? <button className="link-btn" onClick={() => setMode('login')}>Sign in</button></>
          )}
        </p>
        <p className="auth-note">
          You can also <Link to="/checkout">check out as a guest</Link> — no account needed.
        </p>
      </div>
    </div>
  )
}
