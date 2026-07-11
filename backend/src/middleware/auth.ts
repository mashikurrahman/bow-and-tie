import type { NextFunction, Request, Response } from 'express'
import { verifyToken, type JwtPayload } from '../lib/auth'
import { prisma } from '../prisma'

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload
      permissions?: string[]
    }
  }
}

// Admin-panel sections a staff account can be granted access to.
export const ADMIN_SECTIONS = [
  'dashboard', 'products', 'inventory', 'import', 'orders', 'returns', 'customers',
  'promotions', 'coupons', 'reports', 'reviews', 'questions', 'settings', 'staff',
] as const

const parsePerms = (s: string): string[] => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
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

/**
 * Requires an admin role. The role is read from the database (not just the
 * token claim), so admin access reflects the account's *current* role — an old
 * token missing the claim still works for a real admin, and a demoted admin is
 * blocked immediately. Must run after requireAuth.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(403).json({ error: 'Admin access required' })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    // Keep req.user in sync with the live role for downstream handlers.
    if (req.user) req.user.role = user.role
    next()
  } catch {
    res.status(500).json({ error: 'Authorization check failed' })
  }
}

/**
 * Allows admin (full access) or staff (scoped access). Reads the live role and
 * permissions from the DB and attaches req.permissions. Must run after requireAuth.
 */
export async function requireStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(403).json({ error: 'Admin access required' })
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, permissions: true },
    })
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return res.status(403).json({ error: 'Admin access required' })
    }
    if (req.user) req.user.role = user.role
    req.permissions = user.role === 'admin' ? [...ADMIN_SECTIONS] : parsePerms(user.permissions)
    next()
  } catch {
    res.status(500).json({ error: 'Authorization check failed' })
  }
}

// Maps an admin API path to the permission section it belongs to.
const PERM_MAP: [RegExp, string][] = [
  [/^\/stats/, 'dashboard'],
  [/^\/reports/, 'reports'],
  [/^\/inventory/, 'inventory'],
  [/^\/products\/import/, 'import'],
  [/^\/products/, 'products'],
  [/^\/orders\/[^/]+\/refund/, 'returns'],
  [/^\/returns/, 'returns'],
  [/^\/orders/, 'orders'],
  [/^\/customers/, 'customers'],
  [/^\/promotions/, 'promotions'],
  [/^\/coupons/, 'coupons'],
  [/^\/reviews/, 'reviews'],
  [/^\/questions/, 'questions'],
  [/^\/whatsapp/, 'dashboard'],
  [/^\/staff/, 'staff'],
]

/** Blocks a staff user from sections they lack permission for. After requireStaff. */
export function checkPermission(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'admin') return next()
  const perms = req.permissions ?? []
  const rel = req.path.startsWith(req.baseUrl) ? req.path.slice(req.baseUrl.length) : req.path
  const needed = PERM_MAP.find(([re]) => re.test(rel))?.[1]
  if (!needed || perms.includes(needed)) return next()
  return res.status(403).json({ error: `You don't have permission to access ${needed}.` })
}
