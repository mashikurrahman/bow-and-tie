import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

/** Wraps async route handlers so thrown errors reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}

// Final error handler.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors })
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message })
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
}
