import rateLimit from 'express-rate-limit'

// ---------------------------------------------------------------------------
// Rate limiting. Two tiers:
//   - apiLimiter: a generous safety net on the whole API to blunt scraping/DoS.
//   - authLimiter: a strict limit on auth endpoints (login, register, password
//     reset, oauth) to stop brute-force / credential-stuffing.
// Limits are per client IP. Behind a reverse proxy in production, make sure
// `app.set('trust proxy', 1)` is set so the real IP is used (see app.ts).
// ---------------------------------------------------------------------------

const json = (message: string) => ({ error: message })

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // generous — normal browsing stays well under this
  standardHeaders: true,
  legacyHeaders: false,
  message: json('Too many requests. Please slow down and try again shortly.'),
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // login/register/reset attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  // Don't count successful logins/registrations against the limit — only failures.
  skipSuccessfulRequests: true,
  message: json('Too many attempts. Please wait a few minutes and try again.'),
})
