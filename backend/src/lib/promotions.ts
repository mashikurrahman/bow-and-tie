import type { Promotion } from '@prisma/client'

export function parseIds(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** A promotion is live if it's active and within its (optional) date window. */
export function isPromotionLive(p: Promotion, now = new Date()): boolean {
  if (!p.active) return false
  if (p.startsAt && now < p.startsAt) return false
  if (p.endsAt && now > p.endsAt) return false
  return true
}

/** The strongest live promotion that applies to a given product (or null). */
export function bestPromotionForProduct(
  productId: string,
  livePromotions: Promotion[],
): Promotion | null {
  const applicable = livePromotions.filter(
    (p) => p.scope === 'all' || parseIds(p.productIds).includes(productId),
  )
  if (applicable.length === 0) return null
  return applicable.reduce((best, p) => (p.percent > best.percent ? p : best))
}

export type Sale = { price: number; percent: number; title: string; promotionId: string }

export function saleForProduct(
  basePrice: number,
  productId: string,
  livePromotions: Promotion[],
): Sale | null {
  const promo = bestPromotionForProduct(productId, livePromotions)
  if (!promo) return null
  return {
    price: Math.max(0, Math.round(basePrice * (1 - promo.percent / 100))),
    percent: promo.percent,
    title: promo.title,
    promotionId: promo.id,
  }
}

/** Attach a `sale` field to an already-serialized product when a promo applies.
 * Products with their own variants use absolute per-variant prices, so promos
 * are not stacked on top of them. */
export function attachSale<T extends { id: string; price: number; variants?: unknown[] }>(
  product: T,
  livePromotions: Promotion[],
): T & { sale: Sale | null } {
  const sale = product.variants && product.variants.length > 0 ? null : saleForProduct(product.price, product.id, livePromotions)
  return { ...product, sale }
}

export function serializePromotion(p: Promotion) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    percent: p.percent,
    scope: p.scope,
    productIds: parseIds(p.productIds),
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    active: p.active,
    live: isPromotionLive(p),
    showPopup: p.showPopup,
    showSlider: p.showSlider,
    bgColor: p.bgColor,
    ctaLabel: p.ctaLabel,
    createdAt: p.createdAt.toISOString(),
  }
}
