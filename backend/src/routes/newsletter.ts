import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler } from '../middleware/error'
import { sendMailAsync } from '../lib/mailer'
import { newsletterWelcomeEmail } from '../lib/emails'

const router = Router()

const WELCOME_CODE = 'WELCOME10' // seeded coupon (10% off)

// Subscribe to the newsletter and email a welcome coupon.
router.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)
    const normalized = email.toLowerCase().trim()

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalized } })
    if (!existing) {
      await prisma.newsletterSubscriber.create({ data: { email: normalized } })
      // Look up the welcome coupon's real discount (fall back to 10%).
      const coupon = await prisma.promo.findUnique({ where: { code: WELCOME_CODE } })
      const percent = coupon ? Math.round(coupon.rate * 100) : 10
      sendMailAsync(newsletterWelcomeEmail(normalized, WELCOME_CODE, percent))
    }
    // Same response whether new or already subscribed.
    res.status(201).json({ ok: true, code: WELCOME_CODE })
  }),
)

export default router
