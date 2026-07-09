import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { config } from './config'
import { errorHandler, notFound } from './middleware/error'
import { apiLimiter, authLimiter } from './middleware/rateLimit'
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import orderRoutes from './routes/orders'
import accountRoutes from './routes/account'
import adminRoutes from './routes/admin'
import uploadRoutes, { customerUploadRouter } from './routes/upload'
import promotionRoutes from './routes/promotions'
import cartRoutes from './routes/cart'
import newsletterRoutes from './routes/newsletter'

export function createApp() {
  const app = express()

  // Behind a reverse proxy in production (Railway/Render/Nginx), trust the first
  // hop so rate limiting and req.ip use the real client address.
  if (config.isProduction) app.set('trust proxy', 1)

  // Secure HTTP headers. crossOriginResourcePolicy is relaxed so the storefront
  // (a different origin) can load images served from /uploads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

  // CORS: only the configured storefront origin(s) may call the API from a
  // browser. In dev, any localhost port is also allowed (dev servers drift
  // between 5173-5175). Requests with no Origin (curl, server-to-server) pass.
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true)
        if (config.corsOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true)
        if (!config.isProduction && /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true)
        return cb(null, false) // not allowed — browser blocks the response
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  // Generous safety-net rate limit across the whole API.
  app.use('/api', apiLimiter)

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bow-and-tie-api' }))

  // Serve uploaded product images.
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

  // Strict rate limit on auth endpoints (brute-force / credential-stuffing).
  app.use('/api/auth', authLimiter, authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/promotions', promotionRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/cart', cartRoutes)
  app.use('/api/newsletter', newsletterRoutes)
  app.use('/api/account', accountRoutes)
  app.use('/api/admin/upload', uploadRoutes)
  app.use('/api/upload', customerUploadRouter)
  app.use('/api/admin', adminRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
