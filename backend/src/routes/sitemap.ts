import { Router } from 'express'
import { prisma } from '../prisma'
import { config } from '../config'

// Dynamic SEO files. sitemap.xml is generated from the live product catalog so
// it stays current as products are added/removed. URLs use APP_URL as the base,
// so in production point crawlers here (or proxy the storefront's /sitemap.xml
// and /robots.txt to this API) after setting APP_URL to the storefront domain.

const router = Router()
const site = () => config.appUrl.replace(/\/$/, '')

const STATIC_PATHS = ['/', '/shop', '/about', '/contact', '/faq', '/custom-order', '/track', '/shipping', '/returns', '/privacy']
const DISALLOW = ['/checkout', '/cart', '/account', '/orders', '/login', '/wishlist', '/reset-password', '/forgot-password']

router.get('/sitemap.xml', async (_req, res) => {
  const base = site()
  const products = await prisma.product.findMany({ select: { id: true, createdAt: true } })
  const entries = [
    ...STATIC_PATHS.map((p) => `  <url><loc>${base}${p}</loc><priority>${p === '/' ? '1.0' : '0.6'}</priority></url>`),
    ...products.map(
      (p) =>
        `  <url><loc>${base}/product/${p.id}</loc><lastmod>${p.createdAt.toISOString().slice(0, 10)}</lastmod><priority>0.8</priority></url>`,
    ),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
  res.set('Content-Type', 'application/xml').send(xml)
})

router.get('/robots.txt', (_req, res) => {
  const body = ['User-agent: *', 'Allow: /', ...DISALLOW.map((p) => `Disallow: ${p}`), '', `Sitemap: ${site()}/sitemap.xml`, ''].join('\n')
  res.set('Content-Type', 'text/plain').send(body)
})

export default router
