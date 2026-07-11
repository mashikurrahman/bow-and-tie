import { prisma } from '../prisma'

/**
 * Recompute a product's average rating and public review count from its
 * *visible* (non-hidden) reviews. Called after a review is created, hidden,
 * unhidden, or deleted so moderated reviews never skew the displayed rating.
 */
export async function recomputeProductRating(productId: string) {
  const visible = await prisma.review.findMany({
    where: { productId, hidden: false },
    select: { rating: true },
  })
  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0
  await prisma.product.update({
    where: { id: productId },
    data: { rating: Math.round(avg * 10) / 10, reviewsCount: visible.length },
  })
}
