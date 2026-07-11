import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { serializeProduct } from '../lib/serialize'
import { attachSale, isPromotionLive } from '../lib/promotions'
import { recomputeProductRating } from '../lib/reviews'
import { requireAuth, optionalAuth } from '../middleware/auth'

const router = Router()

const livePromotions = async () => {
  const all = await prisma.promotion.findMany({ where: { active: true } })
  return all.filter((p) => isPromotionLive(p))
}

const parseArr = (s: string): string[] => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const reviewOut = (r: {
  name: string
  rating: number
  title: string
  date: string
  text: string
  images: string
  verified: boolean
}) => ({
  name: r.name,
  rating: r.rating,
  title: r.title,
  date: r.date,
  text: r.text,
  images: parseArr(r.images),
  verified: r.verified,
})

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
        include: { reviews: true, variants: true },
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
      prisma.product.findUnique({ where: { id: req.params.id }, include: { reviews: true, variants: true } }),
      livePromotions(),
    ])
    if (!product) throw new HttpError(404, 'Product not found')
    res.json({ product: attachSale(serializeProduct(product), promos) })
  }),
)

// "You may also like" — up to `limit` other products, same category first,
// topped up with recent products so we always return a full row.
router.get(
  '/:id/related',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 4, 12)
    const base = await prisma.product.findUnique({ where: { id: req.params.id }, select: { category: true } })
    if (!base) throw new HttpError(404, 'Product not found')

    const [sameCategory, promos] = await Promise.all([
      prisma.product.findMany({
        where: { category: base.category, id: { not: req.params.id } },
        include: { reviews: true, variants: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      livePromotions(),
    ])

    let picks = sameCategory
    if (picks.length < limit) {
      const exclude = [req.params.id, ...picks.map((p) => p.id)]
      const fill = await prisma.product.findMany({
        where: { id: { notIn: exclude } },
        include: { reviews: true, variants: true },
        orderBy: { createdAt: 'desc' },
        take: limit - picks.length,
      })
      picks = [...picks, ...fill]
    }
    res.json({ products: picks.map((p) => attachSale(serializeProduct(p), promos)) })
  }),
)

// ---- Reviews -------------------------------------------------------------

router.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.id, hidden: false },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ reviews: reviews.map(reviewOut) })
  }),
)

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).default(''),
  text: z.string().min(1).max(2000),
  images: z.array(z.string().url()).max(4).default([]),
})

router.post(
  '/:id/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const productId = req.params.id
    const data = reviewSchema.parse(req.body)
    const [product, user] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.user.findUnique({ where: { id: req.user!.userId } }),
    ])
    if (!product) throw new HttpError(404, 'Product not found')
    if (!user) throw new HttpError(404, 'User not found')

    // One review per customer per product.
    const already = await prisma.review.findFirst({ where: { productId, userId: user.id } })
    if (already) throw new HttpError(409, 'You have already reviewed this product.')

    // Verified purchase = this account has an order containing the product.
    const purchase = await prisma.order.findFirst({
      where: { userId: user.id, items: { some: { productId } } },
      select: { id: true },
    })

    await prisma.review.create({
      data: {
        productId,
        userId: user.id,
        name: user.name,
        rating: data.rating,
        title: data.title,
        text: data.text,
        images: JSON.stringify(data.images),
        verified: Boolean(purchase),
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      },
    })

    // Recompute the product's average rating and review count (visible only).
    await recomputeProductRating(productId)

    const reviews = await prisma.review.findMany({
      where: { productId, hidden: false },
      orderBy: { createdAt: 'desc' },
    })
    res.status(201).json({ reviews: reviews.map(reviewOut), verified: Boolean(purchase) })
  }),
)

// ---- Product Q&A ---------------------------------------------------------

router.get(
  '/:id/questions',
  asyncHandler(async (req, res) => {
    const questions = await prisma.question.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      questions: questions.map((q) => ({
        id: q.id,
        name: q.name,
        question: q.question,
        answer: q.answer ?? null,
        date: q.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      })),
    })
  }),
)

router.post(
  '/:id/questions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { question } = z.object({ question: z.string().min(3).max(500) }).parse(req.body)
    const [product, user] = await Promise.all([
      prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true } }),
    ])
    if (!product) throw new HttpError(404, 'Product not found')
    await prisma.question.create({
      data: { productId: req.params.id, userId: req.user!.userId, name: user?.name ?? 'Customer', question },
    })
    res.status(201).json({ ok: true })
  }),
)

// ---- Back-in-stock alert -------------------------------------------------

router.post(
  '/:id/notify-me',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) throw new HttpError(404, 'Product not found')
    await prisma.stockAlert.upsert({
      where: { productId_email: { productId: product.id, email: email.toLowerCase() } },
      update: { notified: false, userId: req.user?.userId ?? null },
      create: {
        productId: product.id,
        email: email.toLowerCase(),
        userId: req.user?.userId ?? null,
      },
    })
    res.status(201).json({ ok: true })
  }),
)

export default router
