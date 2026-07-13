import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Allowed browser origins (comma-separated in CORS_ORIGIN for multiple, e.g.
  // "https://bowandtie.com,https://www.bowandtie.com"). In dev any localhost
  // port is also allowed; in production only these origins are.
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // Absolute base URL of this API, used to build public upload links.
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  // Public storefront URL, used to build links inside emails (reset, orders…).
  appUrl: process.env.APP_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  storeName: process.env.STORE_NAME ?? 'Bow & Tie',
  // Transactional email. Prefer the Brevo HTTP API (BREVO_API_KEY) — it works
  // over HTTPS (443), which hosts like Render allow, unlike outbound SMTP ports
  // (25/465/587) which Render blocks. Falls back to SMTP if only SMTP_* is set;
  // if neither is set, emails are logged to the console (dev).
  email: {
    brevoApiKey: process.env.BREVO_API_KEY ?? '',
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'Bow & Tie <no-reply@bowandtie.com>',
  },
  // WhatsApp admin alerts (Meta Cloud API). Empty in dev → messages log to console.
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN ?? '',
    phoneId: process.env.WHATSAPP_PHONE_ID ?? '',
    to: process.env.WHATSAPP_ADMIN_TO ?? '', // admin's number in international format, e.g. 8801XXXXXXXXX
    lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 5),
  },
  // Manual mobile-banking payment numbers shown at checkout (customer sends
  // money here, then enters the transaction id). These are defaults — the admin
  // can override them from the settings panel (stored in the Setting table).
  payment: {
    bkashNumber: process.env.BKASH_MERCHANT_NUMBER ?? '',
    nagadNumber: process.env.NAGAD_MERCHANT_NUMBER ?? '',
  },
  // Object storage for uploaded images (Cloudflare R2 or any S3-compatible
  // bucket). Empty → uploads fall back to the local ./uploads disk (fine in dev,
  // but wiped on every redeploy on ephemeral hosts like Render — set these in
  // production). endpoint is derived from the R2 account id; accountId can be
  // left blank and a full S3 endpoint given instead for AWS S3 / other providers.
  storage: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    endpoint: process.env.R2_ENDPOINT ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    // Public base URL the bucket is served from (the r2.dev dev URL or a custom
    // domain), used to build image links. No trailing slash.
    publicUrl: (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, ''),
  },
  // Social login. Empty → the corresponding button is hidden / endpoint rejects.
  google: { clientId: process.env.GOOGLE_CLIENT_ID ?? '' },
  facebook: { appId: process.env.FACEBOOK_APP_ID ?? '', appSecret: process.env.FACEBOOK_APP_SECRET ?? '' },
  // Courier merchant credentials. Empty → a mock tracking code is generated so
  // the "ship" flow works in dev without a merchant account.
  courier: {
    steadfast: { apiKey: process.env.STEADFAST_API_KEY ?? '', secret: process.env.STEADFAST_SECRET ?? '' },
    pathao: { clientId: process.env.PATHAO_CLIENT_ID ?? '', clientSecret: process.env.PATHAO_CLIENT_SECRET ?? '' },
    redx: { apiToken: process.env.REDX_API_TOKEN ?? '' },
  },
}

// Business rules shared with the storefront.
export const FREE_SHIPPING_THRESHOLD = 2500

// Delivery zones — different rate & ETA for inside vs outside Dhaka.
export const SHIPPING_ZONES = {
  inside: { label: 'Inside Dhaka', fee: 60, eta: '1–2 days' },
  outside: { label: 'Outside Dhaka', fee: 120, eta: '3–5 days' },
} as const
export type ShippingZone = keyof typeof SHIPPING_ZONES
export const SHIPPING_FLAT = SHIPPING_ZONES.outside.fee // fallback / legacy

export const shippingFor = (zone: ShippingZone, subtotal: number) =>
  subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_ZONES[zone].fee

export const ORDER_FLOW = ['Processing', 'Confirmed', 'Shipped', 'Delivered'] as const
