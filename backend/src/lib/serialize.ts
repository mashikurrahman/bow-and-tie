import type { Order, OrderItem, Product, Review } from '@prisma/client'

const parseArr = (s: string): string[] => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// Shape a Product row (with JSON-string columns) into the API/frontend shape.
export function serializeProduct(p: Product & { reviews?: Review[] }) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
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
    inStock: p.inStock,
    featured: p.featured,
    stock: p.stock,
    reviewList: (p.reviews ?? [])
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
    notes: o.notes ?? undefined,
    promoCode: o.promoCode ?? undefined,
    status: o.status,
    timeline,
    createdAt: o.createdAt.toISOString(),
  }
}
