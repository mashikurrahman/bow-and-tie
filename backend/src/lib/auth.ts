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
