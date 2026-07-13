import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { config } from '../config'

// ---------------------------------------------------------------------------
// Image storage. When an S3-compatible bucket is configured (Cloudflare R2 or
// AWS S3) uploaded images are stored there and served from its public URL —
// which survives redeploys. Otherwise images fall back to the local ./uploads
// disk (fine for dev, but wiped on every redeploy on ephemeral hosts).
// ---------------------------------------------------------------------------

const localDir = path.resolve(process.cwd(), 'uploads')

// R2/S3 is "on" only when we have credentials, a bucket, and a public base URL
// to build the returned links from.
export const usingRemoteStorage = Boolean(
  config.storage.accessKeyId &&
    config.storage.secretAccessKey &&
    config.storage.bucket &&
    config.storage.publicUrl &&
    (config.storage.endpoint || config.storage.accountId),
)

let client: S3Client | null = null
function s3(): S3Client {
  if (!client) {
    const endpoint =
      config.storage.endpoint ||
      `https://${config.storage.accountId}.r2.cloudflarestorage.com`
    client = new S3Client({
      region: 'auto', // R2 ignores region; S3 users can set R2_ENDPOINT to their regional endpoint
      endpoint,
      credentials: {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      },
    })
  }
  return client
}

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

// A short, collision-resistant object key that keeps the original extension.
function makeKey(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
}

/**
 * Persist an uploaded image and return its public URL. Uploads to R2/S3 when
 * configured, else writes to the local ./uploads dir (dev fallback).
 */
export async function saveImage(
  buffer: Buffer,
  originalName: string,
  mimeType?: string,
): Promise<string> {
  const key = makeKey(originalName)
  const ext = path.extname(key)
  const contentType = mimeType || MIME_BY_EXT[ext] || 'application/octet-stream'

  if (usingRemoteStorage) {
    await s3().send(
      new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Product images are immutable (a new upload = a new key), so let CDNs
        // and browsers cache them aggressively.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )
    return `${config.storage.publicUrl}/${key}`
  }

  fs.mkdirSync(localDir, { recursive: true })
  fs.writeFileSync(path.join(localDir, key), buffer)
  return `${config.publicUrl}/uploads/${key}`
}

/**
 * Best-effort delete of a previously-uploaded image by its public URL. Silently
 * ignores anything that isn't one of our own uploads (e.g. external URLs typed
 * into the import sheet) or storage that's since been reconfigured.
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url) return
  try {
    if (usingRemoteStorage && url.startsWith(config.storage.publicUrl + '/')) {
      const key = url.slice(config.storage.publicUrl.length + 1)
      if (key) await s3().send(new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: key }))
      return
    }
    const marker = '/uploads/'
    const i = url.indexOf(marker)
    if (i !== -1) {
      const name = url.slice(i + marker.length)
      // Guard against path traversal in the key portion.
      if (name && !name.includes('/') && !name.includes('..')) {
        fs.rmSync(path.join(localDir, name), { force: true })
      }
    }
  } catch {
    // Deleting an image is never worth failing the request over.
  }
}