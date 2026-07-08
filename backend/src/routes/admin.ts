import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { serializeOrder, serializeProduct } from '../lib/serialize'
import { serializePromotion } from '../lib/promotions'
import { ORDER_FLOW } from '../config'

const router = Router()
router.use(requireAuth, requireAdmin)

// Admin sees costPrice (kept out of the public product serializer so buying
// cost is never exposed to shoppers).
const withCost = (p: Parameters<typeof serializeProduct>[0] & { costPrice: number }) => ({
  ...serializeProduct(p),
  costPrice: p.costPrice,
})

// ---- Dashboard stats -----------------------------------------------------
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [orders, productCount, customerCount, products] = await Promise.all([
      prisma.order.findMany({ include: { items: true } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.product.findMany(),
    ])

    const paidOrders = orders.filter((o) => o.status !== 'Cancelled')
    const revenue = paidOrders.reduce((s, o) => s + o.total, 0)

    // Profit = revenue - COGS (cost price of sold items) - discounts.
    const costMap = new Map(products.map((p) => [p.id, p.costPrice]))
    let cogs = 0
    let discounts = 0
    for (const o of paidOrders) {
      discounts += o.discount
      for (const it of o.items) {
        cogs += (costMap.get(it.productId ?? '') ?? 0) * it.quantity
      }
    }
    const profit = revenue - cogs - discounts

    // Sales for the last 8 months.
    const now = new Date()
    const months: { label: string; revenue: number; orders: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthOrders = paidOrders.filter(
        (o) => o.createdAt >= d && o.createdAt < next,
      )
      months.push({
        label: d.toLocaleString('en', { month: 'short' }),
        revenue: monthOrders.reduce((s, o) => s + o.total, 0),
        orders: monthOrders.length,
      })
    }

    // Popular products by units sold.
    const soldMap = new Map<string, number>()
    for (const o of paidOrders) {
      for (const it of o.items) {
        if (it.productId) soldMap.set(it.productId, (soldMap.get(it.productId) ?? 0) + it.quantity)
      }
    }
    const popular = products
      .map((p) => ({ product: serializeProduct(p), sold: soldMap.get(p.id) ?? 0 }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)

    const lowStock = products
      .filter((p) => p.stock > 0 && p.stock <= 10)
      .map((p) => ({ id: p.id, name: p.name, stock: p.stock }))

    res.json({
      revenue,
      profit,
      cogs,
      discounts,
      orderCount: orders.length,
      cancelledCount: orders.length - paidOrders.length,
      productCount,
      customerCount,
      avgOrderValue: paidOrders.length ? Math.round(revenue / paidOrders.length) : 0,
      salesByMonth: months,
      popular,
      lowStock,
      recentOrders: orders
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 6)
        .map(serializeOrder),
    })
  }),
)

// ---- Orders --------------------------------------------------------------
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { status, q } = req.query as { status?: string; q?: string }
    const orders = await prisma.order.findMany({
      where: {
        ...(status && status !== 'All' ? { status } : {}),
        ...(q
          ? { OR: [{ id: { contains: q } }, { customerName: { contains: q } }] }
          : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    const counts = await prisma.order.groupBy({ by: ['status'], _count: true })
    res.json({
      orders: orders.map(serializeOrder),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      total: await prisma.order.count(),
    })
  }),
)

const statusSchema = z.object({
  status: z.enum(['Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']),
})

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body)
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) throw new HttpError(404, 'Order not found')
    let timeline: { status: string; at: string }[] = []
    try {
      timeline = JSON.parse(order.timeline)
    } catch {
      timeline = []
    }
    timeline.push({ status, at: new Date().toISOString() })
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status, timeline: JSON.stringify(timeline) },
      include: { items: true },
    })
    res.json({ order: serializeOrder(updated) })
  }),
)

// ---- Products CRUD -------------------------------------------------------
router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { reviews: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ products: products.map(withCost) })
  }),
)

const productSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().int().nonnegative(),
  originalPrice: z.number().int().nonnegative(),
  costPrice: z.number().int().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  badge: z.string().default(''),
  description: z.string().default(''),
  fabric: z.string().default(''),
  delivery: z.string().default(''),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  gallery: z.array(z.string()).default([]),
  image: z.string().default(''),
  inStock: z.boolean().default(true),
  featured: z.boolean().default(false),
})

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body)
    const id = data.id?.trim() || slugify(data.name) || `product-${Date.now()}`
    const exists = await prisma.product.findUnique({ where: { id } })
    if (exists) throw new HttpError(409, `A product with id "${id}" already exists.`)
    const product = await prisma.product.create({
      data: {
        id,
        name: data.name,
        category: data.category,
        price: data.price,
        originalPrice: data.originalPrice || data.price,
        costPrice: data.costPrice,
        stock: data.stock,
        inStock: data.inStock && data.stock > 0 ? true : data.inStock,
        badge: data.badge,
        description: data.description,
        fabric: data.fabric,
        delivery: data.delivery,
        colors: JSON.stringify(data.colors),
        sizes: JSON.stringify(data.sizes),
        gallery: JSON.stringify(data.gallery.length ? data.gallery : [data.image].filter(Boolean)),
        image: data.image || data.gallery[0] || '',
        featured: data.featured,
      },
      include: { reviews: true },
    })
    res.status(201).json({ product: withCost(product) })
  }),
)

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body)
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new HttpError(404, 'Product not found')
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        category: data.category,
        price: data.price,
        originalPrice: data.originalPrice || data.price,
        costPrice: data.costPrice,
        stock: data.stock,
        inStock: data.inStock,
        badge: data.badge,
        description: data.description,
        fabric: data.fabric,
        delivery: data.delivery,
        colors: JSON.stringify(data.colors),
        sizes: JSON.stringify(data.sizes),
        gallery: JSON.stringify(data.gallery.length ? data.gallery : [data.image].filter(Boolean)),
        image: data.image || data.gallery[0] || existing.image,
        featured: data.featured,
      },
      include: { reviews: true },
    })
    res.json({ product: withCost(product) })
  }),
)

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } }).catch(() => {
      throw new HttpError(404, 'Product not found')
    })
    res.json({ ok: true })
  }),
)

// ---- Customers -----------------------------------------------------------
router.get(
  '/customers',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: 'customer' },
      include: { addresses: true, orders: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      customers: users.map((u) => {
        const paid = u.orders.filter((o) => o.status !== 'Cancelled')
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone ?? u.addresses[0]?.phone ?? '',
          address: u.addresses[0] ? `${u.addresses[0].address}, ${u.addresses[0].city}` : '',
          orderCount: u.orders.length,
          totalSpent: paid.reduce((s, o) => s + o.total, 0),
          createdAt: u.createdAt.toISOString(),
        }
      }),
    })
  }),
)

// ---- Promotions (campaigns) ----------------------------------------------
router.get(
  '/promotions',
  asyncHandler(async (_req, res) => {
    const promos = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ promotions: promos.map(serializePromotion) })
  }),
)

const promotionSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  percent: z.number().int().min(1).max(90),
  scope: z.enum(['all', 'selected']).default('all'),
  productIds: z.array(z.string()).default([]),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean().default(true),
  showPopup: z.boolean().default(true),
  showSlider: z.boolean().default(true),
  bgColor: z.string().default('#c9527a'),
  ctaLabel: z.string().default('Shop the sale'),
})

const toPromotionData = (d: z.infer<typeof promotionSchema>) => ({
  title: d.title,
  description: d.description,
  percent: d.percent,
  scope: d.scope,
  productIds: JSON.stringify(d.scope === 'selected' ? d.productIds : []),
  startsAt: d.startsAt ? new Date(d.startsAt) : null,
  endsAt: d.endsAt ? new Date(d.endsAt) : null,
  active: d.active,
  showPopup: d.showPopup,
  showSlider: d.showSlider,
  bgColor: d.bgColor,
  ctaLabel: d.ctaLabel,
})

router.post(
  '/promotions',
  asyncHandler(async (req, res) => {
    const data = promotionSchema.parse(req.body)
    const promo = await prisma.promotion.create({ data: toPromotionData(data) })
    res.status(201).json({ promotion: serializePromotion(promo) })
  }),
)

router.put(
  '/promotions/:id',
  asyncHandler(async (req, res) => {
    const data = promotionSchema.parse(req.body)
    const exists = await prisma.promotion.findUnique({ where: { id: req.params.id } })
    if (!exists) throw new HttpError(404, 'Promotion not found')
    const promo = await prisma.promotion.update({
      where: { id: req.params.id },
      data: toPromotionData(data),
    })
    res.json({ promotion: serializePromotion(promo) })
  }),
)

router.delete(
  '/promotions/:id',
  asyncHandler(async (req, res) => {
    await prisma.promotion.delete({ where: { id: req.params.id } }).catch(() => {
      throw new HttpError(404, 'Promotion not found')
    })
    res.json({ ok: true })
  }),
)

// ---- Coupons (checkout codes) --------------------------------------------
router.get(
  '/coupons',
  asyncHandler(async (_req, res) => {
    const coupons = await prisma.promo.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({
      coupons: coupons.map((c) => ({
        code: c.code,
        percent: Math.round(c.rate * 100),
        label: c.label,
        active: c.active,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  }),
)

const couponSchema = z.object({
  code: z.string().min(2).max(20),
  percent: z.number().int().min(1).max(90),
  label: z.string().default(''),
})

router.post(
  '/coupons',
  asyncHandler(async (req, res) => {
    const data = couponSchema.parse(req.body)
    const code = data.code.trim().toUpperCase()
    const exists = await prisma.promo.findUnique({ where: { code } })
    if (exists) throw new HttpError(409, `Coupon "${code}" already exists.`)
    const coupon = await prisma.promo.create({
      data: { code, rate: data.percent / 100, label: data.label, active: true },
    })
    res.status(201).json({
      coupon: { code: coupon.code, percent: data.percent, label: coupon.label, active: coupon.active },
    })
  }),
)

router.put(
  '/coupons/:code',
  asyncHandler(async (req, res) => {
    const active = z.object({ active: z.boolean() }).parse(req.body).active
    const coupon = await prisma.promo.update({ where: { code: req.params.code }, data: { active } })
    res.json({ coupon: { code: coupon.code, percent: Math.round(coupon.rate * 100), label: coupon.label, active: coupon.active } })
  }),
)

router.delete(
  '/coupons/:code',
  asyncHandler(async (req, res) => {
    await prisma.promo.delete({ where: { code: req.params.code } }).catch(() => {
      throw new HttpError(404, 'Coupon not found')
    })
    res.json({ ok: true })
  }),
)

const ORDER_STATUSES = ORDER_FLOW
export { ORDER_STATUSES }
export default router
