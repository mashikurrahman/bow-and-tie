import { Router } from 'express'
import { asyncHandler } from '../middleware/error'
import { getPublicSettings } from '../lib/settings'

// Public storefront settings (no auth) — currently the bKash / Nagad merchant
// numbers the checkout page shows. GET /api/settings
const router = Router()

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getPublicSettings())
  }),
)

export default router