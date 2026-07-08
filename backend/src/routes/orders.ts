import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { optionalAuth, requireAuth } from '../middleware/auth'
import { serializeOrder } from '../lib/serialize'
import { makeOrderId } from '../lib/ids'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT } from '../config'
import { isPromotionLive, saleForProduct } from '../lib/promotions'

const router = Router()

const createSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        color: z.string().optional(),
        size: z.string().optional(),
      }),
    )
    .min(1),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
  }),
  payment: z.enum(['cod', 'bkash', 'nagad']),
  txnId: z.string().optional(),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
})

// Create an order. Prices, discount and shipping are recomputed server-side
// (never trusted from the client) and stock is decremented atomically.
router.post(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body)

    const order = await prisma.$transaction(async (tx) => {
      const lineItems: {
        productId: string
        name: string
        image: string
        price: number
        quantity: number
        color?: string
        size?: string
      }[] = []
      let subtotal = 0

      // Live promotions auto-discount matching products at order time.
      const livePromos = (await tx.promotion.findMany({ where: { active: true } })).filter((p) =>
        isPromotionLive(p),
      )

      for (const line of input.items) {
        const product = await tx.product.findUnique({ where: { id: line.productId } })
        if (!product) throw new HttpError(400, `Unknown product: ${line.productId}`)
        if (!product.inStock) throw new HttpError(409, `${product.name} is sold out.`)
        const sale = saleForProduct(product.price, product.id, livePromos)
        const unitPrice = sale?.price ?? product.price
        subtotal += unitPrice * line.quantity
        lineItems.push({
          productId: product.id,
          name: product.name,
          image: product.image,
          price: unitPrice,
          quantity: line.quantity,
          color: line.color,
          size: line.size,
        })
        // Decrement stock (custom items use a large sentinel stock).
        if (product.stock > 0) {
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: Math.max(0, product.stock - line.quantity),
              inStock: product.stock - line.quantity > 0,
            },
          })
        }
      }

      let discount = 0
      let promoCode: string | undefined
      if (input.promoCode) {
        const promo = await tx.promo.findUnique({ where: { code: input.promoCode.toUpperCase() } })
        if (promo && promo.active) {
          discount = Math.round(subtotal * promo.rate)
          promoCode = promo.code
        }
      }

      const shipping = subtotal === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT
      const total = subtotal - discount + shipping
      const now = new Date().toISOString()

      return tx.order.create({
        data: {
          id: makeOrderId(),
          userId: req.user?.userId ?? null,
          subtotal,
          discount,
          shipping,
          total,
          customerName: input.customer.name,
          customerPhone: input.customer.phone,
          customerAddress: input.customer.address,
          customerCity: input.customer.city,
          payment: input.payment,
          txnId: input.txnId,
          notes: input.notes,
          promoCode,
          status: 'Processing',
          timeline: JSON.stringify([{ status: 'Processing', at: now }]),
          items: { create: lineItems },
        },
        include: { items: true },
      })
    })

    res.status(201).json({ order: serializeOrder(order) })
  }),
)

// Current user's orders.
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ orders: orders.map(serializeOrder) })
  }),
)

// Public tracking by order id (the id acts as the lookup token).
router.get(
  '/track/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id.toUpperCase() },
      include: { items: true },
    })
    if (!order) throw new HttpError(404, 'No order found with that number.')
    res.json({ order: serializeOrder(order) })
  }),
)

// A specific order for the logged-in owner (or admin).
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id.toUpperCase() },
      include: { items: true },
    })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.userId !== req.user!.userId && req.user!.role !== 'admin') {
      throw new HttpError(403, 'Not allowed')
    }
    res.json({ order: serializeOrder(order) })
  }),
)

export default router
