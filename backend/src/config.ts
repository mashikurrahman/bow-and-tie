import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Absolute base URL of this API, used to build public upload links.
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
}

// Business rules shared with the storefront.
export const SHIPPING_FLAT = 120
export const FREE_SHIPPING_THRESHOLD = 2500
export const ORDER_FLOW = ['Processing', 'Confirmed', 'Shipped', 'Delivered'] as const
