import { OAuth2Client } from 'google-auth-library'
import { config } from '../config'

// Verifies a social-login token and returns the verified identity.
// Throws if the provider isn't configured or the token is invalid.

export interface SocialIdentity {
  email: string
  name: string
}

const googleClient = new OAuth2Client()

/** Verify a Google Identity Services credential (a signed ID token). */
export async function verifyGoogle(credential: string): Promise<SocialIdentity> {
  if (!config.google.clientId) throw new Error('Google login is not configured.')
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.google.clientId })
  const payload = ticket.getPayload()
  if (!payload?.email || !payload.email_verified) throw new Error('Google account email not verified.')
  return { email: payload.email.toLowerCase(), name: payload.name ?? payload.email.split('@')[0] }
}

/** Verify a Facebook access token via the Graph API. */
export async function verifyFacebook(accessToken: string): Promise<SocialIdentity> {
  if (!config.facebook.appId) throw new Error('Facebook login is not configured.')
  const url = `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(url)
  const data = (await res.json().catch(() => ({}))) as { email?: string; name?: string; error?: unknown }
  if (!res.ok || !data.email) throw new Error('Could not verify Facebook account (email permission required).')
  return { email: data.email.toLowerCase(), name: data.name ?? data.email.split('@')[0] }
}

export async function verifySocial(provider: 'google' | 'facebook', token: string): Promise<SocialIdentity> {
  return provider === 'google' ? verifyGoogle(token) : verifyFacebook(token)
}
