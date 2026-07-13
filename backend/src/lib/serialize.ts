import type { Order, OrderItem, Product, ProductVariant, Review } from '@prisma/client'

const parseArr = (s: string): string[] => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// Shape a Product row (with JSON-string columns) into the API/frontend shape.
export function serializeProduct(p: Product & { reviews?: Review[]; variants?: ProductVariant[] }) {
  const variants = (p.variants ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
    .map((v) => ({
      id: v.id,
      label: v.label,
      color: v.color ?? undefined,
      size: v.size ?? undefined,
      price: v.price,
      stock: v.stock,
      image: v.image ?? undefined,
      inStock: v.stock > 0,
    }))
  const hasVariants = variants.length > 0
  // When a product has variants, price/stock/availability are derived from them
  // ("from" the cheapest variant); otherwise the product's own fields are used.
  const price = hasVariants ? Math.min(...variants.map((v) => v.price)) : p.price
  const stock = hasVariants ? variants.reduce((s, v) => s + v.stock, 0) : p.stock
  const inStock = hasVariants ? variants.some((v) => v.stock > 0) : p.inStock
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price,
    originalPrice: p.originalPrice,
    rating: p.rating,
    reviews: p.reviewsCount,
    badge: p.badge,
    description: p.description,
    fabric: p.fabric,
    delivery: p.delivery,
    colors: parseArr(p.colors),
    sizes: parseArr(p.sizes),
    gallery: parseArr(p.gallery),
    image: p.image,
    inStock,
    featured: p.featured,
    stock,
    variants,
    reviewList: (p.reviews ?? [])
      .filter((r) => !r.hidden)
      .slice()
      .sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0))
      .map((r) => ({
        name: r.name,
        rating: r.rating,
        title: r.title ?? '',
        date: r.date,
        text: r.text,
        images: parseArr(r.images ?? '[]'),
        verified: r.verified ?? false,
      })),
  }
}

export function serializeOrder(o: Order & { items?: OrderItem[] }) {
  let timeline: { status: string; at: string }[] = []
  try {
    timeline = JSON.parse(o.timeline)
  } catch {
    timeline = []
  }
  return {
    id: o.id,
    userId: o.userId,
    items: (o.items ?? []).map((it) => ({
      productId: it.productId,
      variantId: it.variantId ?? undefined,
      name: it.name,
      image: it.image,
      price: it.price,
      quantity: it.quantity,
      color: it.color ?? undefined,
      size: it.size ?? undefined,
    })),
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    customer: {
      name: o.customerName,
      phone: o.customerPhone,
      address: o.customerAddress,
      city: o.customerCity,
    },
    deliveryZone: o.deliveryZone,
    courier: o.courier ?? undefined,
    trackingCode: o.trackingCode ?? undefined,
    payment: o.payment,
    txnId: o.txnId ?? undefined,
    paymentVerified: o.paymentVerified,
    giftWrap: o.giftWrap,
    giftMessage: o.giftMessage ?? undefined,
    notes: o.notes ?? undefined,
    promoCode: o.promoCode ?? undefined,
    status: o.status,
    timeline,
    returnReason: o.returnReason ?? undefined,
    refundStatus: o.refundStatus ?? undefined,
    refundAmount: o.refundAmount ?? undefined,
    refundMethod: o.refundMethod ?? undefined,
    refundedAt: o.refundedAt?.toISOString(),
    createdAt: o.createdAt.toISOString(),
  }
}
