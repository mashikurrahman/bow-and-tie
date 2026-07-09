import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useStore } from '../store/StoreContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined

// Loads an external script once and resolves when ready.
const loadScript = (src: string, id: string) =>
  new Promise<void>((resolve) => {
    if (document.getElementById(id)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.id = id
    s.async = true
    s.onload = () => resolve()
    document.head.appendChild(s)
  })

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SocialLogin({ redirectTo }: { redirectTo: string }) {
  const { oauth } = useAuth()
  const { notify } = useStore()
  const navigate = useNavigate()
  const googleBtn = useRef<HTMLDivElement>(null)

  const finish = async (provider: 'google' | 'facebook', token: string) => {
    try {
      await oauth(provider, token)
      notify('Welcome! 🎀')
      navigate(redirectTo)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Social login failed')
    }
  }

  // Google Identity Services button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtn.current) return
    loadScript('https://accounts.google.com/gsi/client', 'gsi-script').then(() => {
      const g = (window as any).google
      if (!g?.accounts?.id) return
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => finish('google', resp.credential),
      })
      g.accounts.id.renderButton(googleBtn.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const facebookLogin = async () => {
    if (!FACEBOOK_APP_ID) return
    await loadScript('https://connect.facebook.net/en_US/sdk.js', 'fb-script')
    const FB = (window as any).FB
    FB.init({ appId: FACEBOOK_APP_ID, version: 'v20.0', cookie: true, xfbml: false })
    FB.login(
      (response: any) => {
        const token = response?.authResponse?.accessToken
        if (token) finish('facebook', token)
      },
      { scope: 'email,public_profile' },
    )
  }

  if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null

  return (
    <div className="social-login">
      <div className="social-divider"><span>or continue with</span></div>
      {GOOGLE_CLIENT_ID && <div className="social-google" ref={googleBtn} />}
      {FACEBOOK_APP_ID && (
        <button type="button" className="social-fb" onClick={facebookLogin}>
          <span>f</span> Continue with Facebook
        </button>
      )}
    </div>
  )
}
