import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useStore } from '../store/StoreContext'
import { usePageMeta } from '../hooks/usePageMeta'

export default function VerifyEmailPage() {
  usePageMeta({ title: 'Verify Email', noindex: true })
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { verifyEmail } = useAuth()
  const { notify } = useStore()

  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>(id && token ? 'verifying' : 'error')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current || !id || !token) return
    ran.current = true // guard against React 18 double-invoke
    verifyEmail(id, token)
      .then(() => {
        setStatus('done')
        notify('Email verified — thank you! 🎀')
        setTimeout(() => navigate('/account'), 1600)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'This link is invalid or has expired.')
      })
  }, [id, token, verifyEmail, notify, navigate])

  return (
    <div className="page narrow auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <h1 className="auth-title">Verifying your email…</h1>
            <p className="muted">One moment while we confirm your account.</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div style={{ fontSize: 44 }}>✅</div>
            <h1 className="auth-title">Email verified!</h1>
            <p className="muted">You’re all set. Taking you to your account…</p>
            <Link to="/account" className="btn btn-full" style={{ marginTop: 16 }}>Go to my account</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 44 }}>⚠️</div>
            <h1 className="auth-title">Couldn’t verify</h1>
            <p className="muted">{message || 'This verification link is incomplete or has expired.'}</p>
            <p className="muted" style={{ marginTop: 8 }}>Sign in and use the “Resend” button to get a fresh link.</p>
            <Link to="/login" className="btn btn-full" style={{ marginTop: 16 }}>Go to sign in</Link>
          </>
        )}
      </div>
    </div>
  )
}
