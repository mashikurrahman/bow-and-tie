import { prisma } from '../prisma'
import { sendMailAsync } from './mailer'
import { abandonedCartEmail } from './emails'

// ---------------------------------------------------------------------------
// Abandoned-cart recovery.
//
// The storefront reports a shopper's cart (with their email) as they build it.
// If no order follows within REMIND_AFTER_MS, a one-time reminder email goes
// out. Placing an order clears the record so no reminder is sent.
// ---------------------------------------------------------------------------

const REMIND_AFTER_MS = 30 * 60 * 1000 // 30 minutes
const SWEEP_INTERVAL_MS = 5 * 60 * 1000 // check every 5 minutes

export interface CartSnapshotItem {
  name: string
  quantity: number
  price: number
  image?: string
}

/** Upsert the shopper's current cart snapshot (called as they shop). */
export async function trackCart(email: string, items: CartSnapshotItem[], total: number): Promise<void> {
  const normalized = email.toLowerCase().trim()
  if (!normalized || !items.length) return
  await prisma.abandonedCart.upsert({
    where: { email: normalized },
    // A fresh update resets the reminder clock and re-arms the reminder.
    update: { items: JSON.stringify(items), total, reminded: false },
    create: { email: normalized, items: JSON.stringify(items), total, reminded: false },
  })
}

/** Remove the record once the shopper checks out (or empties their cart). */
export async function clearAbandonedCart(email: string): Promise<void> {
  await prisma.abandonedCart
    .delete({ where: { email: email.toLowerCase().trim() } })
    .catch(() => {}) // no record → nothing to clear
}

// Find stale, un-reminded carts and email their owners once.
async function sweep(): Promise<void> {
  const cutoff = new Date(Date.now() - REMIND_AFTER_MS)
  const stale = await prisma.abandonedCart.findMany({
    where: { reminded: false, updatedAt: { lt: cutoff } },
  })
  for (const cart of stale) {
    let items: CartSnapshotItem[] = []
    try {
      items = JSON.parse(cart.items)
    } catch {
      items = []
    }
    if (items.length) sendMailAsync(abandonedCartEmail(cart.email, items))
    await prisma.abandonedCart.update({ where: { id: cart.id }, data: { reminded: true } })
  }
}

let timer: NodeJS.Timeout | null = null

/** Start the background sweeper (called once at server startup). */
export function startAbandonedCartSweeper(): void {
  if (timer) return
  timer = setInterval(() => {
    void sweep().catch((err) =>
      console.error('abandoned-cart sweep failed:', err instanceof Error ? err.message : err),
    )
  }, SWEEP_INTERVAL_MS)
  // Don't keep the process alive just for this timer.
  timer.unref?.()
}
