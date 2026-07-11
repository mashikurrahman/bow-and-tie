import type { Prisma } from '@prisma/client'

type RestockItem = { productId?: string | null; variantId?: string | null; quantity: number }

/**
 * Return the stock of the given order items back to inventory. Variant-aware:
 * when an item was a variant SKU, its variant stock is restored and the
 * product's aggregate stock/availability is recomputed from all its variants;
 * otherwise the product's own stock is topped up. Safe to call inside a
 * transaction (pass the tx client) — used by order cancel and refund flows.
 */
export async function restockOrderItems(tx: Prisma.TransactionClient, items: RestockItem[]) {
  for (const it of items) {
    if (!it.productId) continue

    if (it.variantId) {
      const variant = await tx.productVariant.findUnique({ where: { id: it.variantId } })
      if (!variant) continue
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: variant.stock + it.quantity },
      })
      // Recompute the product aggregate from its (now-updated) variants.
      const variants = await tx.productVariant.findMany({ where: { productId: it.productId } })
      const total = variants.reduce((s, v) => s + v.stock, 0)
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: total, inStock: total > 0 },
      })
    } else {
      const product = await tx.product.findUnique({ where: { id: it.productId } })
      if (!product) continue
      await tx.product.update({
        where: { id: product.id },
        data: { stock: product.stock + it.quantity, inStock: true },
      })
    }
  }
}
