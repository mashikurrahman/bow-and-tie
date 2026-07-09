import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/error'
import { optionalAuth } from '../middleware/auth'
import { prisma } from '../prisma'
import { trackCart, clearAbandonedCart } from '../lib/abandonedCart'

const router = Router()

const snapshotSchema = z.object({
  email: z.string().email().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().int().nonnegative(),
        image: z.string().optional(),
      }),
    )
    .default([]),
  total: z.number().int().nonnegative().default(0),
})

// Record the shopper's current cart so we can send a reminder if they leave.
router.post(
  '/track',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { email, items, total } = snapshotSchema.parse(req.body)
    // Prefer the typed email, else the logged-in account's email.
    let target = email ?? null
    if (!target && req.user?.userId) {
      const acct = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true } })
      target = acct?.email ?? null
    }
    if (target) {
      if (items.length) await trackCart(target, items, total)
      else await clearAbandonedCart(target) // cart emptied → drop the reminder
    }
    res.json({ ok: true })
  }),
)

export default router
