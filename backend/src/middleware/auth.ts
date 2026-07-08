import type { NextFunction, Request, Response } from 'express'
import { verifyToken, type JwtPayload } from '../lib/auth'

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

/** Attaches req.user if a valid token is present; never blocks. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req)
  if (token) {
    try {
      req.user = verifyToken(token)
    } catch {
      /* ignore invalid token for optional auth */
    }
  }
  next()
}

/** Requires a valid token, else 401. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/** Requires an admin role (for the future admin panel). */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}
