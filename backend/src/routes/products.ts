import { Router } from 'express'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { serializeProduct } from '../lib/serialize'
import { attachSale, isPromotionLive } from '../lib/promotions'

const router = Router()

const livePromotions = async () => {
  const all = await prisma.promotion.findMany({ where: { active: true } })
  return all.filter((p) => isPromotionLive(p))
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, q } = req.query as { category?: string; q?: string }
    const [products, promos] = await Promise.all([
      prisma.product.findMany({
        where: {
          ...(category && category !== 'All' ? { category } : {}),
          ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}),
        },
        include: { reviews: true },
        orderBy: { createdAt: 'asc' },
      }),
      livePromotions(),
    ])
    res.json({ products: products.map((p) => attachSale(serializeProduct(p), promos)) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [product, promos] = await Promise.all([
      prisma.product.findUnique({ where: { id: req.params.id }, include: { reviews: true } }),
      livePromotions(),
    ])
    if (!product) throw new HttpError(404, 'Product not found')
    res.json({ product: attachSale(serializeProduct(product), promos) })
  }),
)

export default router
