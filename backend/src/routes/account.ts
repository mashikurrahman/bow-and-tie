import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { asyncHandler, HttpError } from '../middleware/error'
import { requireAuth } from '../middleware/auth'
import { serializeUser } from '../lib/user'
import { comparePassword, hashPassword } from '../lib/auth'

const router = Router()
router.use(requireAuth)

const reload = (userId: string) =>
  prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { addresses: true } })

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
})

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const patch = profileSchema.parse(req.body)
    await prisma.user.update({ where: { id: req.user!.userId }, data: patch })
    res.json({ user: serializeUser(await reload(req.user!.userId)) })
  }),
)

const addressSchema = z.object({
  label: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
})

router.post(
  '/addresses',
  asyncHandler(async (req, res) => {
    const data = addressSchema.parse(req.body)
    await prisma.address.create({ data: { ...data, userId: req.user!.userId } })
    res.status(201).json({ user: serializeUser(await reload(req.user!.userId)) })
  }),
)

router.delete(
  '/addresses/:id',
  asyncHandler(async (req, res) => {
    await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } })
    res.json({ user: serializeUser(await reload(req.user!.userId)) })
  }),
)

const passwordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(4),
})

router.put(
  '/password',
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = passwordSchema.parse(req.body)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } })
    if (!(await comparePassword(oldPassword, user.password))) {
      throw new HttpError(400, 'Current password is incorrect.')
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword) },
    })
    res.json({ ok: true })
  }),
)

export default router
