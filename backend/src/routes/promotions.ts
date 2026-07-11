import { Router } from 'express'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { serializeProduct } from '../lib/serialize'
import { attachSale, isPromotionLive, parseIds, serializePromotion } from '../lib/promotions'

const router = Router()

// Live promotions to surface on the storefront (popup + hero slider).
router.get(
  '/active',
  asyncHandler(async (_req, res) => {
    const all = await prisma.promotion.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ promotions: all.filter((p) => isPromotionLive(p)).map(serializePromotion) })
  }),
)

// Validate a checkout coupon code against the live Promo table. Returns the
// discount rate if the code exists and is active, else 404. (Kept above /:id
// so "coupon" isn't treated as a promotion id.)
router.get(
  '/coupon/:code',
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim().toUpperCase()
    const promo = await prisma.promo.findUnique({ where: { code } })
    if (!promo || !promo.active) throw new HttpError(404, 'This promo code is invalid or has expired.')
    res.json({ code: promo.code, rate: promo.rate, label: promo.label })
  }),
)

// A single promotion + the products it discounts (for the sale landing page).
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const promotion = await prisma.promotion.findUnique({ where: { id: req.params.id } })
    if (!promotion) throw new HttpError(404, 'Promotion not found')

    const live = isPromotionLive(promotion) ? [promotion] : []
    const where =
      promotion.scope === 'selected'
        ? { id: { in: parseIds(promotion.productIds) } }
        : {}
    const products = await prisma.product.findMany({ where, include: { reviews: true } })

    res.json({
      promotion: serializePromotion(promotion),
      products: products.map((p) => attachSale(serializeProduct(p), live)),
    })
  }),
)

export default router
