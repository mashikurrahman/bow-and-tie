import { Router } from 'express'
import { prisma } from '../prisma'
import { asyncHandler } from '../middleware/error'
import { serializeProduct } from '../lib/serialize'

// Public storefront bundles ("complete the look" sets). GET /api/bundles
const router = Router()

const parseIds = (s: string): string[] => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const bundles = await prisma.bundle.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    const allIds = [...new Set(bundles.flatMap((b) => parseIds(b.productIds)))]
    const products = await prisma.product.findMany({
      where: { id: { in: allIds } },
      include: { reviews: true, variants: true },
    })
    const byId = new Map(products.map((p) => [p.id, serializeProduct(p)]))
    res.json({
      bundles: bundles
        .map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description,
          image: b.image,
          products: parseIds(b.productIds).map((id) => byId.get(id)).filter(Boolean),
        }))
        .filter((b) => b.products.length > 0),
    })
  }),
)

export default router