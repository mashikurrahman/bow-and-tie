import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { comparePassword, hashPassword, signToken } from '../lib/auth'
import { requireAuth } from '../middleware/auth'
import { serializeUser } from '../lib/user'

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
