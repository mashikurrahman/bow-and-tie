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
import { restockOrderItems } from '../lib/inventory'
import { pointsForOrder, refundRedeemedPoints } from '../lib/loyalty'

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
        variantId: z.string().optional(),
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
  giftWrap: z.boolean().optional(),
  giftMessage: z.string().max(500).optional(),
  redeemPoints: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
}).refine((v) => v.payment === 'cod' || Boolean(v.txnId?.trim()), {
  message: 'A transaction ID is required for bKash/Nagad payments.',
  path: ['txnId'],
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
        variantId?: string
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

      const t = config.whatsapp.lowStockThreshold
      for (const line of input.items) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: { variants: true },
        })
        if (!product) throw new HttpError(400, `Unknown product: ${line.productId}`)

        if (product.variants.length > 0) {
          // Variant product: a specific SKU must be chosen; price & stock come
          // from that variant. Promotions are not stacked on variant prices.
          const variant = line.variantId
            ? product.variants.find((v) => v.id === line.variantId)
            : undefined
          if (!variant) throw new HttpError(400, `Please choose an option for ${product.name}.`)
          if (variant.stock < line.quantity) {
            throw new HttpError(409, `${product.name} (${variant.label}) — only ${variant.stock} left.`)
          }
          subtotal += variant.price * line.quantity
          lineItems.push({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            image: variant.image ?? product.image,
            price: variant.price,
            quantity: line.quantity,
            color: variant.color ?? undefined,
            size: variant.size ?? undefined,
          })
          // Decrement the variant, then recompute the product's aggregate stock.
          const newVarStock = variant.stock - line.quantity
          await tx.productVariant.update({ where: { id: variant.id }, data: { stock: newVarStock } })
          const remaining = product.variants.reduce(
            (s, v) => s + (v.id === variant.id ? newVarStock : v.stock),
            0,
          )
          await tx.product.update({
            where: { id: product.id },
            data: { stock: remaining, inStock: remaining > 0 },
          })
          if (variant.stock > t && newVarStock <= t) {
            lowStockHits.push({ name: `${product.name} (${variant.label})`, stock: newVarStock })
          }
        } else {
          // No variants: product-level price + stock (promotions apply).
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
            if (product.stock > t && newStock <= t) lowStockHits.push({ name: product.name, stock: newStock })
          }
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

      // Loyalty: a logged-in customer may spend points (1 point = ৳1), capped at
      // the after-discount order value and their balance. Points are deducted now
      // and given back if the order is cancelled/refunded. Earned points are
      // computed here but only credited when the order is delivered.
      let pointsRedeemed = 0
      let pointsEarned = 0
      if (req.user?.userId) {
        const acct = await tx.user.findUnique({ where: { id: req.user.userId }, select: { points: true } })
        const balance = acct?.points ?? 0
        pointsRedeemed = Math.max(0, Math.min(input.redeemPoints ?? 0, balance, subtotal - discount))
        if (pointsRedeemed > 0) {
          await tx.user.update({ where: { id: req.user.userId }, data: { points: { decrement: pointsRedeemed } } })
        }
        pointsEarned = pointsForOrder(subtotal)
      }

      // Zone drives the delivery fee; fall back to guessing from the city.
      const zone =
        input.deliveryZone ??
        (input.customer.city.trim().toLowerCase() === 'dhaka' ? 'inside' : 'outside')
      const shipping = shippingFor(zone, subtotal)
      const total = subtotal - discount - pointsRedeemed + shipping
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
          giftWrap: input.giftWrap ?? false,
          giftMessage: input.giftMessage,
          pointsRedeemed,
          pointsEarned,
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
      // Return the reserved stock to inventory (variant-aware).
      await restockOrderItems(tx, order.items)
      const timeline = safeTimeline(order.timeline)
      timeline.push({ status: 'Cancelled', at: new Date().toISOString() })
      return tx.order.update({
        where: { id: order.id },
        data: { status: 'Cancelled', timeline: JSON.stringify(timeline) },
        include: { items: true },
      })
    })

    await refundRedeemedPoints(updated.id)
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
    if (order.refundStatus && order.refundStatus !== 'Rejected') {
      throw new HttpError(409, 'A return is already in progress for this order.')
    }
    const timeline = safeTimeline(order.timeline)
    timeline.push({ status: 'Return Requested', at: new Date().toISOString() })
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'Return Requested',
        timeline: JSON.stringify(timeline),
        returnReason: reason ?? null,
        refundStatus: 'Requested',
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
