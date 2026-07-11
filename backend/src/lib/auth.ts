import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export type JwtPayload = { userId: string; role: string }

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10)
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash)

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

// Password-reset tokens are signed with a secret derived from the user's
// current password hash, so a token becomes invalid the moment the password
// changes (single-use) — and no extra database column is needed.
const resetSecret = (passwordHash: string) => config.jwtSecret + passwordHash

export function signResetToken(userId: string, passwordHash: string): string {
  return jwt.sign({ userId, purpose: 'reset' }, resetSecret(passwordHash), { expiresIn: '1h' })
}

export function verifyResetToken(token: string, passwordHash: string): boolean {
  try {
    const payload = jwt.verify(token, resetSecret(passwordHash)) as { purpose?: string }
    return payload.purpose === 'reset'
  } catch {
    return false
  }
}

// Email-verification tokens: a short-lived JWT tying the link to a user id.
// Signed with the app secret (not the password hash) so it survives password
// changes; expires in 24h.
export function signVerifyToken(userId: string): string {
  return jwt.sign({ userId, purpose: 'verify' }, config.jwtSecret, { expiresIn: '24h' })
}

export function verifyVerifyToken(token: string, userId: string): boolean {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId?: string; purpose?: string }
    return payload.purpose === 'verify' && payload.userId === userId
  } catch {
    return false
  }
}
