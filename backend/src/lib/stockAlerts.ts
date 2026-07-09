import { prisma } from '../prisma'
import { sendMailAsync } from './mailer'
import { backInStockEmail } from './emails'
import { config } from '../config'

// When a product is restocked, email everyone who asked to be notified, then
// mark those alerts as sent so nobody gets pinged twice.
export async function notifyRestock(productId: string): Promise<void> {
  try {
    const alerts = await prisma.stockAlert.findMany({ where: { productId, notified: false } })
    if (!alerts.length) return
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return
    const url = `${config.appUrl.replace(/\/$/, '')}/product/${productId}`
    for (const alert of alerts) {
      sendMailAsync(backInStockEmail(alert.email, product.name, url))
    }
    await prisma.stockAlert.updateMany({
      where: { id: { in: alerts.map((a) => a.id) } },
      data: { notified: true },
    })
  } catch (err) {
    console.error('notifyRestock failed:', err instanceof Error ? err.message : err)
  }
}

// Helper the write paths use: did this update bring a product back in stock?
export function cameBackInStock(prevStock: number, nextStock: number): boolean {
  return prevStock <= 0 && nextStock > 0
}
