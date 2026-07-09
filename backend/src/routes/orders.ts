import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { optionalAuth, requireAuth } from '../middleware/auth'
import { serializeOrder } from '../lib/serialize'
import { makeOrderId } from '../lib/ids'
import { config, shippingFor } from '../config'
import { isPromotionLive, saleForProduct } from '../lib/promotions'
import { sendMailAsync } from '../lib/mailer'
import { sendWhatsAppAsync, newOrderAlert, lowStockAlert } from '../lib/whatsapp'
import { orderConfirmationEmail, orderStatusEmail, type OrderEmailData } from '../lib/emails'
import { clearAbandonedCart } from '../lib/abandonedCart'

const router = Router()

// Parse a stored timeline JSON string, tolerating bad data.
function safeTimeline(json: string): { status: string; at: string }[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// Shape a full order row into the data our email templates expect.
function orderEmailData(o: {
  id: string
  items: { name: string; quantity: number; price: number }[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  customerName: string
  customerAddress: string
  customerCity: string
  payment: string
}): OrderEmailData {
  return {
    id: o.id,
    items: o.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    customerName: o.customerName,
    customerAddress: o.customerAddress,
    customerCity: o.customerCity,
    payment: o.payment,
  }
}

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
    email: z.string().email().optional(),
    phone: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
  }),
  payment: z.enum(['cod', 'bkash', 'nagad']),
  deliveryZone: z.enum(['inside', 'outside']).optional(),
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

    // Resolve the email to send the confirmation to: the one typed at checkout,
    // else the logged-in account's email.
    let customerEmail = input.customer.email ?? null
    if (!customerEmail && req.user?.userId) {
      const acct = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true } })
      customerEmail = acct?.email ?? null
    }

    const lowStockHits: { name: string; stock: number }[] = []
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
          const newStock = Math.max(0, product.stock - line.quantity)
          await tx.product.update({
            where: { id: product.id },
            data: { stock: newStock, inStock: newStock > 0 },
          })
          // Flag products that just crossed the low-stock threshold.
          const t = config.whatsapp.lowStockThreshold
          if (product.stock > t && newStock <= t) lowStockHits.push({ name: product.name, stock: newStock })
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

      // Zone drives the delivery fee; fall back to guessing from the city.
      const zone =
        input.deliveryZone ??
        (input.customer.city.trim().toLowerCase() === 'dhaka' ? 'inside' : 'outside')
      const shipping = shippingFor(zone, subtotal)
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
          customerEmail,
          customerPhone: input.customer.phone,
          customerAddress: input.customer.address,
          customerCity: input.customer.city,
          deliveryZone: zone,
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

    // Send the order-confirmation email (fire-and-forget) and stop any pending
    // abandoned-cart reminder for this shopper.
    if (customerEmail) {
      sendMailAsync(
        orderConfirmationEmail(customerEmail, {
          id: order.id,
          items: order.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
          subtotal: order.subtotal,
          discount: order.discount,
          shipping: order.shipping,
          total: order.total,
          customerName: order.customerName,
          customerAddress: order.customerAddress,
          customerCity: order.customerCity,
          payment: order.payment,
        }),
      )
      clearAbandonedCart(customerEmail)
    }

    // WhatsApp alerts to the shop admin: new order + any low-stock warnings.
    sendWhatsAppAsync(
      newOrderAlert({
        id: order.id,
        total: order.total,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        payment: order.payment,
        items: order.items.map((it) => ({ name: it.name, quantity: it.quantity })),
      }),
    )
    for (const hit of lowStockHits) sendWhatsAppAsync(lowStockAlert(hit.name, hit.stock))

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

// Customer cancels their own order (only before it ships).
router.post(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id.toUpperCase() },
      include: { items: true },
    })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.userId !== req.user!.userId && req.user!.role !== 'admin') throw new HttpError(403, 'Not allowed')
    if (!['Processing', 'Confirmed'].includes(order.status)) {
      throw new HttpError(409, `This order can no longer be cancelled (it is ${order.status.toLowerCase()}).`)
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Return the reserved stock to inventory.
      for (const it of order.items) {
        if (it.productId) {
          const p = await tx.product.findUnique({ where: { id: it.productId } })
          if (p) {
            await tx.product.update({
              where: { id: p.id },
              data: { stock: p.stock + it.quantity, inStock: true },
            })
          }
        }
      }
      const timeline = safeTimeline(order.timeline)
      timeline.push({ status: 'Cancelled', at: new Date().toISOString() })
      return tx.order.update({
        where: { id: order.id },
        data: { status: 'Cancelled', timeline: JSON.stringify(timeline) },
        include: { items: true },
      })
    })

    if (updated.customerEmail) {
      sendMailAsync(orderStatusEmail(updated.customerEmail, orderEmailData(updated), 'Cancelled'))
    }
    res.json({ order: serializeOrder(updated) })
  }),
)

// Customer requests a return on a delivered order.
router.post(
  '/:id/return',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(req.body)
    const order = await prisma.order.findUnique({
      where: { id: req.params.id.toUpperCase() },
      include: { items: true },
    })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.userId !== req.user!.userId && req.user!.role !== 'admin') throw new HttpError(403, 'Not allowed')
    if (order.status !== 'Delivered') {
      throw new HttpError(409, 'Returns can only be requested on delivered orders.')
    }
    const timeline = safeTimeline(order.timeline)
    timeline.push({ status: 'Return Requested', at: new Date().toISOString() })
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'Return Requested',
        timeline: JSON.stringify(timeline),
        notes: reason ? `${order.notes ? order.notes + ' | ' : ''}Return: ${reason}` : order.notes,
      },
      include: { items: true },
    })
    res.json({ order: serializeOrder(updated) })
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
