import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { saveImage } from '../lib/storage'

// Buffer the upload in memory, then hand it to the storage layer (R2/S3 in
// production, local ./uploads disk in dev). Nothing touches disk directly here.
const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

const handleUpload = async (req: import('express').Request, res: import('express').Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded (png/jpg/svg/webp, max 4MB)' })
  const url = await saveImage(req.file.buffer, req.file.originalname, req.file.mimetype)
  res.status(201).json({ url })
}

// Admin uploads (products, banners) — POST /api/admin/upload
const router = Router()
router.post('/', requireAuth, requireAdmin, upload.single('image'), asyncHandler(handleUpload))
export default router

// Customer uploads (e.g. review photos) — POST /api/upload (any logged-in user)
export const customerUploadRouter = Router()
customerUploadRouter.post('/', requireAuth, upload.single('image'), asyncHandler(handleUpload))
