import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma'

// Records every successful admin/staff mutation (POST/PUT/PATCH/DELETE) as an
// audit-log entry, after the response is sent so it never slows the request.
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING.has(req.method)) return next()
  res.on('finish', () => {
    if (res.statusCode >= 400) return
    const path = req.originalUrl.split('?')[0]
    const userId = req.user?.userId ?? null
    void prisma.auditLog.create({ data: { userId, action: `${req.method} ${path}` } }).catch(() => {})
  })
  next()
}