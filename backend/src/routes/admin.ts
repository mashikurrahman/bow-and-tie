import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { requireAuth, requireStaff, checkPermission, ADMIN_SECTIONS } from '../middleware/auth'
import { hashPassword } from '../lib/auth'
import { serializeOrder, serializeProduct } from '../lib/serialize'
import { serializePromotion } from '../lib/promotions'
import { extractRows } from '../lib/importProducts'
import { sendMailAsync } from '../lib/mailer'
import { orderStatusEmail } from '../lib/emails'
import { notifyRestock, cameBackInStock } from '../lib/stockAlerts'
import { restockOrderItems } from '../lib/inventory'
import { recomputeProductRating } from '../lib/reviews'
import { sendWhatsAppAsync, restockAlert, buildSalesReport } from '../lib/whatsapp'
import { createConsignment, COURIERS } from '../lib/courier'
import type { OrderEmailData } from '../lib/emails'
import { ORDER_FLOW, config } from '../config'

const router = Router()
router.use(requireAuth, requireStaff, checkPermission)

// In-memory upload for bulk imports (parsed then discarded, never saved to disk).
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// Parse a JSON-string array column, tolerating bad data.
const parseJsonArr = (s: string): string[] => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// Admin sees costPrice (kept out of the public product serializer so buying
// cost is never exposed to shoppers).
const withCost = (p: Parameters<typeof serializeProduct>[0] & { costPrice: number }) => ({
  ...serializeProduct(p),
  costPrice: p.costPrice,
})

// Shape a full order row into the data the email templates expect.
const orderEmailDataFor = (o: {
  id: string; subtotal: number; discount: number; shipping: number; total: number
  customerName: string; customerAddress: string; customerCity: string; payment: string
  items: { name: string; quantity: number; price: number }[]
}): OrderEmailData => ({
  id: o.id,
  items: o.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
  subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total,
  customerName: o.customerName, customerAddress: o.customerAddress, customerCity: o.customerCity, payment: o.payment,
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

// Single order (for the printable invoice / packing slip view).
router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!order) throw new HttpError(404, 'Order not found')
    res.json({ order: serializeOrder(order) })
  }),
)

// Ship an order via a courier — creates a consignment (mock if no creds), stores
// the tracking code, marks it Shipped, and notifies the customer.
router.post(
  '/orders/:id/ship',
  asyncHandler(async (req, res) => {
    const { provider } = z.object({ provider: z.enum(COURIERS) }).parse(req.body)
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!order) throw new HttpError(404, 'Order not found')

    const result = await createConsignment(provider, {
      orderId: order.id,
      name: order.customerName,
      phone: order.customerPhone,
      address: order.customerAddress,
      city: order.customerCity,
      amount: order.payment === 'cod' ? order.total : 0,
      itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
    })

    let timeline: { status: string; at: string }[] = []
    try {
      timeline = JSON.parse(order.timeline)
    } catch {
      timeline = []
    }
    timeline.push({ status: 'Shipped', at: new Date().toISOString() })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { courier: provider, trackingCode: result.trackingCode, status: 'Shipped', timeline: JSON.stringify(timeline) },
      include: { items: true },
    })
    if (updated.customerEmail) {
      sendMailAsync(orderStatusEmail(updated.customerEmail, orderEmailDataFor(updated), 'Shipped'))
    }
    res.json({ order: serializeOrder(updated), tracking: result })
  }),
)

const statusSchema = z.object({
  status: z.enum([
    'Processing',
    'Confirmed',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Return Requested',
    'Returned',
  ]),
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
    // Email the customer about the status change (skip the initial Processing).
    if (updated.customerEmail && status !== 'Processing') {
      sendMailAsync(
        orderStatusEmail(
          updated.customerEmail,
          {
            id: updated.id,
            items: updated.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
            subtotal: updated.subtotal,
            discount: updated.discount,
            shipping: updated.shipping,
            total: updated.total,
            customerName: updated.customerName,
            customerAddress: updated.customerAddress,
            customerCity: updated.customerCity,
            payment: updated.payment,
          },
          status,
        ),
      )
    }
    res.json({ order: serializeOrder(updated) })
  }),
)

// ---- Returns & refunds ---------------------------------------------------

// The return/refund queue: every order a customer has asked to return.
router.get(
  '/returns',
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      where: { refundStatus: { not: null } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    const counts = await prisma.order.groupBy({
      by: ['refundStatus'],
      where: { refundStatus: { not: null } },
      _count: true,
    })
    res.json({
      returns: orders.map(serializeOrder),
      counts: Object.fromEntries(counts.map((c) => [c.refundStatus, c._count])),
    })
  }),
)

const refundSchema = z.object({
  action: z.enum(['approve', 'reject', 'refund']),
  amount: z.number().int().min(0).optional(),
  method: z.enum(['bkash', 'nagad', 'cash', 'original']).optional(),
})

// Move a return through its lifecycle: approve → refund, or reject. Refunding
// restocks the returned items (variant-aware) and records the amount/method.
router.patch(
  '/orders/:id/refund',
  asyncHandler(async (req, res) => {
    const { action, amount, method } = refundSchema.parse(req.body)
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!order) throw new HttpError(404, 'Order not found')
    if (!order.refundStatus) throw new HttpError(409, 'No return has been requested for this order.')
    if (order.refundStatus === 'Refunded') throw new HttpError(409, 'This order has already been refunded.')

    const timeline = (() => {
      try {
        const v = JSON.parse(order.timeline)
        return Array.isArray(v) ? (v as { status: string; at: string }[]) : []
      } catch {
        return []
      }
    })()
    const now = new Date().toISOString()

    let emailStatus = ''
    const updated = await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        timeline.push({ status: 'Return Approved', at: now })
        emailStatus = 'Return Approved'
        return tx.order.update({
          where: { id: order.id },
          data: { refundStatus: 'Approved', status: 'Return Requested', timeline: JSON.stringify(timeline) },
          include: { items: true },
        })
      }
      if (action === 'reject') {
        timeline.push({ status: 'Return Rejected', at: now })
        emailStatus = 'Return Rejected'
        return tx.order.update({
          where: { id: order.id },
          // Return the order to its prior fulfilled state.
          data: { refundStatus: 'Rejected', status: 'Delivered', timeline: JSON.stringify(timeline) },
          include: { items: true },
        })
      }
      // action === 'refund' — money returned + goods back on the shelf.
      await restockOrderItems(tx, order.items)
      timeline.push({ status: 'Returned', at: now })
      emailStatus = 'Refunded'
      return tx.order.update({
        where: { id: order.id },
        data: {
          refundStatus: 'Refunded',
          refundAmount: amount ?? order.total,
          refundMethod: method ?? 'original',
          refundedAt: new Date(),
          status: 'Returned',
          timeline: JSON.stringify(timeline),
        },
        include: { items: true },
      })
    })

    if (updated.customerEmail && emailStatus) {
      sendMailAsync(orderStatusEmail(updated.customerEmail, orderEmailDataFor(updated), emailStatus))
    }
    res.json({ order: serializeOrder(updated) })
  }),
)

// ---- Products CRUD -------------------------------------------------------
router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { reviews: true, variants: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ products: products.map(withCost) })
  }),
)

const variantSchema = z.object({
  label: z.string().default(''),
  color: z.string().nullish(),
  size: z.string().nullish(),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  image: z.string().nullish(),
  sku: z.string().nullish(),
})

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
  variants: z.array(variantSchema).default([]),
})

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Normalize incoming variant rows into Prisma create rows (drop blank ones).
const mapVariants = (vs: z.infer<typeof variantSchema>[]) =>
  vs
    .filter((v) => v.price >= 0 && (v.label?.trim() || v.color || v.size))
    .map((v, i) => ({
      label: v.label?.trim() || [v.color, v.size].filter(Boolean).join(' / ') || 'Variant',
      color: v.color || null,
      size: v.size || null,
      price: v.price,
      stock: v.stock,
      image: v.image || null,
      sku: v.sku || null,
      sortOrder: i,
    }))

// When a product has variants, its own stock/inStock are derived from them.
const derivedStock = (variants: { stock: number }[], baseStock: number, baseInStock: boolean) =>
  variants.length
    ? { stock: variants.reduce((s, v) => s + v.stock, 0), inStock: variants.some((v) => v.stock > 0) }
    : { stock: baseStock, inStock: baseInStock }

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body)
    const id = data.id?.trim() || slugify(data.name) || `product-${Date.now()}`
    const exists = await prisma.product.findUnique({ where: { id } })
    if (exists) throw new HttpError(409, `A product with id "${id}" already exists.`)
    const variants = mapVariants(data.variants)
    const derived = derivedStock(variants, data.stock, data.inStock && data.stock > 0 ? true : data.inStock)
    const product = await prisma.product.create({
      data: {
        id,
        name: data.name,
        category: data.category,
        price: data.price,
        originalPrice: data.originalPrice || data.price,
        costPrice: data.costPrice,
        stock: derived.stock,
        inStock: derived.inStock,
        badge: data.badge,
        description: data.description,
        fabric: data.fabric,
        delivery: data.delivery,
        colors: JSON.stringify(data.colors),
        sizes: JSON.stringify(data.sizes),
        gallery: JSON.stringify(data.gallery.length ? data.gallery : [data.image].filter(Boolean)),
        image: data.image || data.gallery[0] || '',
        featured: data.featured,
        variants: { create: variants },
      },
      include: { reviews: true, variants: true },
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
    const variants = mapVariants(data.variants)
    const derived = derivedStock(variants, data.stock, data.inStock)
    // Replace the variant set atomically, then update the product.
    const product = await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: req.params.id } })
      return tx.product.update({
        where: { id: req.params.id },
        data: {
          name: data.name,
          category: data.category,
          price: data.price,
          originalPrice: data.originalPrice || data.price,
          costPrice: data.costPrice,
          stock: derived.stock,
          inStock: derived.inStock,
          badge: data.badge,
          description: data.description,
          fabric: data.fabric,
          delivery: data.delivery,
          colors: JSON.stringify(data.colors),
          sizes: JSON.stringify(data.sizes),
          gallery: JSON.stringify(data.gallery.length ? data.gallery : [data.image].filter(Boolean)),
          image: data.image || data.gallery[0] || existing.image,
          featured: data.featured,
          variants: { create: variants },
        },
        include: { reviews: true, variants: true },
      })
    })
    // Restocked from zero? Email waiting customers + WhatsApp the admin.
    if (cameBackInStock(existing.stock, product.stock)) {
      void notifyRestock(product.id)
      sendWhatsAppAsync(restockAlert(product.name, product.stock))
    }
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

// ---- Bulk product import (CSV / Excel / PDF) ------------------------------

// Build the Prisma create/update payload from a validated product row.
const toProductData = (d: z.infer<typeof productSchema>) => {
  const gallery = d.gallery.length ? d.gallery : [d.image].filter(Boolean)
  return {
    name: d.name,
    category: d.category,
    price: d.price,
    originalPrice: d.originalPrice || d.price,
    costPrice: d.costPrice,
    stock: d.stock,
    inStock: d.stock > 0,
    badge: d.badge,
    description: d.description,
    fabric: d.fabric,
    delivery: d.delivery,
    colors: JSON.stringify(d.colors),
    sizes: JSON.stringify(d.sizes),
    gallery: JSON.stringify(gallery),
    image: d.image || gallery[0] || '',
    featured: d.featured,
  }
}

// Step 1: parse + validate the file and return a preview (nothing is saved).
router.post(
  '/products/import',
  importUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No file uploaded (.csv, .xlsx, or .pdf)')

    let mapped
    try {
      mapped = await extractRows(req.file.buffer, req.file.originalname)
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : 'Could not read the file.')
    }
    if (!mapped.length) {
      throw new HttpError(
        400,
        'No product rows found. Check that the file has a header row (name, category, price…) and at least one product.',
      )
    }

    const prepared = mapped.map((m, i) => {
      const parsed = productSchema.safeParse(m)
      const errors = parsed.success
        ? []
        : parsed.error.issues.map((e) => `${e.path.join('.') || 'row'}: ${e.message}`)
      // Business rule: a 0 price on import almost always means the cell was
      // empty or couldn't be read — flag it instead of silently importing.
      if (parsed.success && parsed.data.price <= 0) errors.push('price: must be greater than 0')

      if (errors.length) {
        return {
          row: i + 2, // +2 = header row + 1-based
          valid: false,
          action: 'skip' as const,
          id: m.id || slugify(m.name),
          data: m,
          errors,
        }
      }
      const data = parsed.success ? parsed.data : m
      const id = ('id' in data && data.id?.trim()) || slugify(m.name)
      return {
        row: i + 2,
        valid: true,
        action: 'create' as 'create' | 'update',
        id,
        data,
        errors: [] as string[],
      }
    })

    // Flag which valid rows would update an existing product vs create new.
    const ids = prepared.filter((p) => p.valid && p.id).map((p) => p.id)
    const existing = new Set(
      (await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id),
    )
    for (const p of prepared) if (p.valid) p.action = existing.has(p.id) ? 'update' : 'create'

    const valid = prepared.filter((p) => p.valid)
    res.json({
      rows: prepared,
      summary: {
        total: prepared.length,
        valid: valid.length,
        invalid: prepared.length - valid.length,
        toCreate: valid.filter((p) => p.action === 'create').length,
        toUpdate: valid.filter((p) => p.action === 'update').length,
      },
    })
  }),
)

// Step 2: commit the confirmed rows. Re-validated server-side (client prices
// are never trusted). Creates new products and updates existing ones by id.
router.post(
  '/products/import/commit',
  asyncHandler(async (req, res) => {
    const body = z.object({ rows: z.array(z.record(z.unknown())) }).parse(req.body)
    let created = 0
    let updated = 0
    const failed: { name: string; error: string }[] = []

    for (const raw of body.rows) {
      const parsed = productSchema.safeParse(raw)
      if (!parsed.success || parsed.data.price <= 0) {
        failed.push({
          name: String((raw as Record<string, unknown>)?.name ?? 'Unknown'),
          error: parsed.success ? 'price must be greater than 0' : parsed.error.issues[0]?.message ?? 'Invalid row',
        })
        continue
      }
      const d = parsed.data
      const id = d.id?.trim() || slugify(d.name) || `product-${Date.now()}`
      const data = toProductData(d)
      const exists = await prisma.product.findUnique({ where: { id }, select: { stock: true } })
      if (exists) {
        await prisma.product.update({ where: { id }, data })
        if (cameBackInStock(exists.stock, data.stock)) void notifyRestock(id)
        updated++
      } else {
        await prisma.product.create({ data: { id, ...data } })
        created++
      }
    }

    res.json({ created, updated, failed })
  }),
)

// ---- Product Q&A management ----------------------------------------------
router.get(
  '/questions',
  asyncHandler(async (_req, res) => {
    const [questions, products] = await Promise.all([
      prisma.question.findMany({ orderBy: [{ answer: 'asc' }, { createdAt: 'desc' }] }),
      prisma.product.findMany({ select: { id: true, name: true } }),
    ])
    const names = new Map(products.map((p) => [p.id, p.name]))
    res.json({
      questions: questions.map((q) => ({
        id: q.id,
        productId: q.productId,
        productName: names.get(q.productId) ?? q.productId,
        name: q.name,
        question: q.question,
        answer: q.answer ?? null,
        createdAt: q.createdAt.toISOString(),
      })),
    })
  }),
)

router.put(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    const { answer } = z.object({ answer: z.string().min(1).max(1000) }).parse(req.body)
    const q = await prisma.question
      .update({ where: { id: req.params.id }, data: { answer, answeredAt: new Date() } })
      .catch(() => {
        throw new HttpError(404, 'Question not found')
      })
    res.json({ question: { id: q.id, answer: q.answer } })
  }),
)

router.delete(
  '/questions/:id',
  asyncHandler(async (req, res) => {
    await prisma.question.delete({ where: { id: req.params.id } }).catch(() => {
      throw new HttpError(404, 'Question not found')
    })
    res.json({ ok: true })
  }),
)

// ---- Review moderation ---------------------------------------------------
router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const { q } = req.query as { q?: string }
    const [reviews, products] = await Promise.all([
      prisma.review.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.product.findMany({ select: { id: true, name: true } }),
    ])
    const names = new Map(products.map((p) => [p.id, p.name]))
    const rows = reviews
      .map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: names.get(r.productId) ?? r.productId,
        name: r.name,
        rating: r.rating,
        title: r.title,
        text: r.text,
        images: parseJsonArr(r.images),
        verified: r.verified,
        hidden: r.hidden,
        createdAt: r.createdAt.toISOString(),
      }))
      .filter((r) =>
        q ? [r.productName, r.name, r.text, r.title].some((s) => s.toLowerCase().includes(q.toLowerCase())) : true,
      )
    res.json({ reviews: rows })
  }),
)

// Hide/unhide a review (spam or abuse). Rating is recomputed from visible reviews.
router.patch(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    const { hidden } = z.object({ hidden: z.boolean() }).parse(req.body)
    const review = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!review) throw new HttpError(404, 'Review not found')
    await prisma.review.update({ where: { id: review.id }, data: { hidden } })
    await recomputeProductRating(review.productId)
    res.json({ ok: true, hidden })
  }),
)

router.delete(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!review) throw new HttpError(404, 'Review not found')
    await prisma.review.delete({ where: { id: review.id } })
    await recomputeProductRating(review.productId)
    res.json({ ok: true })
  }),
)

// ---- Inventory (low-stock visibility, per SKU) ---------------------------
router.get(
  '/inventory',
  asyncHandler(async (req, res) => {
    const threshold = Math.max(0, Number(req.query.threshold) || 5)
    const products = await prisma.product.findMany({
      include: { variants: true },
      orderBy: { name: 'asc' },
    })
    type InventoryRow = {
      productId: string
      productName: string
      variantId?: string
      label?: string
      sku?: string
      stock: number
      price: number
      image: string
    }
    // One row per stock-keeping unit: a variant row for each variant, or the
    // product itself when it has none.
    const rows: InventoryRow[] = products.flatMap((p): InventoryRow[] =>
      p.variants.length > 0
        ? p.variants.map((v) => ({
            productId: p.id,
            productName: p.name,
            variantId: v.id,
            label: v.label,
            sku: v.sku ?? undefined,
            stock: v.stock,
            price: v.price,
            image: v.image ?? p.image,
          }))
        : [{
            productId: p.id,
            productName: p.name,
            variantId: undefined,
            label: undefined,
            sku: undefined,
            stock: p.stock,
            price: p.price,
            image: p.image,
          }],
    )
    rows.sort((a, b) => a.stock - b.stock)
    res.json({
      threshold,
      rows,
      summary: {
        skuCount: rows.length,
        outOfStock: rows.filter((r) => r.stock <= 0).length,
        lowStock: rows.filter((r) => r.stock > 0 && r.stock <= threshold).length,
      },
    })
  }),
)

// ---- WhatsApp alerts (test + on-demand report) ---------------------------
router.post(
  '/whatsapp/test',
  asyncHandler(async (_req, res) => {
    sendWhatsAppAsync('✅ Test alert from Bow & Tie — WhatsApp admin notifications are working!')
    const configured = Boolean(config.whatsapp.token && config.whatsapp.phoneId && config.whatsapp.to)
    res.json({ ok: true, configured })
  }),
)

router.get(
  '/whatsapp/report',
  asyncHandler(async (req, res) => {
    const month = req.query.period === 'month'
    const text = await buildSalesReport(month ? 30 : 7, month ? 'Monthly' : 'Weekly')
    sendWhatsAppAsync(text)
    res.json({ ok: true, preview: text })
  }),
)

// ---- Reports (date-range sales / profit analytics) -----------------------
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string }
    const start = from ? new Date(from) : new Date(0)
    const end = to ? new Date(`${to}T23:59:59.999`) : new Date()

    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end }, status: { not: 'Cancelled' } },
        include: { items: true },
      }),
      prisma.product.findMany({ select: { id: true, name: true, category: true, costPrice: true } }),
    ])
    const pmap = new Map(products.map((p) => [p.id, p]))

    let productSales = 0
    let cogs = 0
    let unitsSold = 0
    let orderTotal = 0
    let discounts = 0
    const byProduct = new Map<string, { id: string; name: string; category: string; qty: number; revenue: number; profit: number }>()
    const byCategory = new Map<string, { category: string; qty: number; revenue: number; profit: number }>()

    for (const o of orders) {
      orderTotal += o.total
      discounts += o.discount
      for (const it of o.items) {
        const p = it.productId ? pmap.get(it.productId) : undefined
        const rev = it.price * it.quantity
        const cost = (p?.costPrice ?? 0) * it.quantity
        const profit = rev - cost
        const cat = p?.category ?? 'Other'
        productSales += rev
        cogs += cost
        unitsSold += it.quantity

        const pk = it.productId ?? it.name
        const pc = byProduct.get(pk) ?? { id: pk, name: it.name, category: cat, qty: 0, revenue: 0, profit: 0 }
        pc.qty += it.quantity; pc.revenue += rev; pc.profit += profit
        byProduct.set(pk, pc)

        const cc = byCategory.get(cat) ?? { category: cat, qty: 0, revenue: 0, profit: 0 }
        cc.qty += it.quantity; cc.revenue += rev; cc.profit += profit
        byCategory.set(cat, cc)
      }
    }

    const products_sorted = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue)
    res.json({
      range: { from: start.toISOString(), to: end.toISOString() },
      summary: {
        orderCount: orders.length,
        unitsSold,
        productSales,
        cogs,
        grossProfit: productSales - cogs,
        margin: productSales ? Math.round(((productSales - cogs) / productSales) * 100) : 0,
        orderTotal,
        discounts,
        avgOrderValue: orders.length ? Math.round(orderTotal / orders.length) : 0,
      },
      byProduct: products_sorted,
      byCategory: [...byCategory.values()].sort((a, b) => b.revenue - a.revenue),
    })
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

// ---- Staff & permissions (admin only — gated by the 'staff' section) -----
const validPerms = (arr: string[]) =>
  arr.filter((p) => (ADMIN_SECTIONS as readonly string[]).includes(p) && p !== 'staff')

const staffOut = (u: { id: string; name: string; email: string; role: string; permissions: string; createdAt: Date }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  permissions: u.role === 'admin' ? [...ADMIN_SECTIONS] : validPerms(JSON.parse(u.permissions || '[]')),
  createdAt: u.createdAt.toISOString(),
})

router.get(
  '/staff',
  asyncHandler(async (_req, res) => {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['admin', 'staff'] } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    })
    res.json({ staff: staff.map(staffOut), sections: [...ADMIN_SECTIONS].filter((s) => s !== 'staff') })
  }),
)

const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  permissions: z.array(z.string()).default([]),
})

router.post(
  '/staff',
  asyncHandler(async (req, res) => {
    const data = staffSchema.parse(req.body)
    const email = data.email.toLowerCase()
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, 'A user with this email already exists.')
    }
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        password: await hashPassword(data.password),
        role: 'staff',
        permissions: JSON.stringify(validPerms(data.permissions)),
      },
    })
    res.status(201).json({ staff: staffOut(user) })
  }),
)

const staffUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(4).optional(),
})

router.put(
  '/staff/:id',
  asyncHandler(async (req, res) => {
    const data = staffUpdateSchema.parse(req.body)
    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) throw new HttpError(404, 'User not found')
    if (target.role === 'admin') throw new HttpError(400, "Admin accounts can't be edited here.")
    const patch: { name?: string; permissions?: string; password?: string } = {}
    if (data.name) patch.name = data.name
    if (data.permissions) patch.permissions = JSON.stringify(validPerms(data.permissions))
    if (data.password) patch.password = await hashPassword(data.password)
    const user = await prisma.user.update({ where: { id: req.params.id }, data: patch })
    res.json({ staff: staffOut(user) })
  }),
)

router.delete(
  '/staff/:id',
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) throw new HttpError(404, 'User not found')
    if (target.role === 'admin') throw new HttpError(400, "Admin accounts can't be removed here.")
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  }),
)

const ORDER_STATUSES = ORDER_FLOW
export { ORDER_STATUSES }
export default router
