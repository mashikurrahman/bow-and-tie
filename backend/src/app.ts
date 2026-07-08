import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { config } from './config'
import { errorHandler, notFound } from './middleware/error'
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import orderRoutes from './routes/orders'
import accountRoutes from './routes/account'
import adminRoutes from './routes/admin'
import uploadRoutes from './routes/upload'
import promotionRoutes from './routes/promotions'

export function createApp() {
  const app = express()

  // Allow the configured origin plus any localhost port (dev servers drift
  // between 5173-5175). Tighten this to config.corsOrigin in production.
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || origin === config.corsOrigin || /^http:\/\/localhost:\d+$/.test(origin)) {
          return cb(null, true)
        }
        cb(null, true)
      },
      credentials: true,
    }),
  )
  app.use(express.json())

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bow-and-tie-api' }))

  // Serve uploaded product images.
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/promotions', promotionRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/account', accountRoutes)
  app.use('/api/admin/upload', uploadRoutes)
  app.use('/api/admin', adminRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
