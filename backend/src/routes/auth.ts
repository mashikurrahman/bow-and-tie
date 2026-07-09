import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import {
  comparePassword,
  hashPassword,
  signToken,
  signResetToken,
  verifyResetToken,
} from '../lib/auth'
import { requireAuth } from '../middleware/auth'
import { serializeUser } from '../lib/user'
import { sendMailAsync } from '../lib/mailer'
import { welcomeEmail, passwordResetEmail } from '../lib/emails'
import { verifySocial } from '../lib/oauth'
import { randomBytes } from 'node:crypto'
import { config } from '../config'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = registerSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) throw new HttpError(409, 'An account with this email already exists.')

    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), password: await hashPassword(password) },
      include: { addresses: true },
    })
    const token = signToken({ userId: user.id, role: user.role })
    sendMailAsync(welcomeEmail(user.email, user.name))
    res.status(201).json({ token, user: serializeUser(user) })
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { addresses: true },
    })
    if (!user || !(await comparePassword(password, user.password))) {
      throw new HttpError(401, 'Invalid email or password.')
    }
    const token = signToken({ userId: user.id, role: user.role })
    res.json({ token, user: serializeUser(user) })
  }),
)

// Social login (Google / Facebook). Verifies the provider token, then finds or
// creates the customer account and returns a normal app session.
router.post(
  '/oauth',
  asyncHandler(async (req, res) => {
    const { provider, token } = z
      .object({ provider: z.enum(['google', 'facebook']), token: z.string().min(1) })
      .parse(req.body)

    let identity
    try {
      identity = await verifySocial(provider, token)
    } catch (err) {
      throw new HttpError(401, err instanceof Error ? err.message : 'Social login failed.')
    }

    let user = await prisma.user.findUnique({ where: { email: identity.email }, include: { addresses: true } })
    if (!user) {
      // New social user — create with a random password they never use.
      user = await prisma.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          password: await hashPassword(randomBytes(24).toString('hex')),
        },
        include: { addresses: true },
      })
      sendMailAsync(welcomeEmail(user.email, user.name))
    }
    const authToken = signToken({ userId: user.id, role: user.role })
    res.json({ token: authToken, user: serializeUser(user) })
  }),
)

// Request a password reset link (always returns ok — never reveals whether an
// account exists, to avoid email enumeration).
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (user) {
      const token = signResetToken(user.id, user.password)
      const resetUrl = `${config.appUrl.replace(/\/$/, '')}/reset-password?id=${user.id}&token=${token}`
      sendMailAsync(passwordResetEmail(user.email, user.name, resetUrl))
    }
    res.json({ ok: true })
  }),
)

// Complete a password reset with the emailed token.
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { id, token, password } = z
      .object({ id: z.string().min(1), token: z.string().min(1), password: z.string().min(4) })
      .parse(req.body)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || !verifyResetToken(token, user.password)) {
      throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.')
    }
    await prisma.user.update({ where: { id }, data: { password: await hashPassword(password) } })
    res.json({ ok: true })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { addresses: true },
    })
    if (!user) throw new HttpError(404, 'User not found')
    res.json({ user: serializeUser(user) })
  }),
)

export default router
