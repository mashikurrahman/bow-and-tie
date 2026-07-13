// Admin API client (all endpoints require an admin JWT).
import { api, getToken } from './api'
import type { Order, OrderStatus } from './db'
import type { Promotion } from './promotions'

export type { Promotion }

export type PromotionInput = {
  title: string
  description: string
  percent: number
  scope: 'all' | 'selected'
  productIds: string[]
  startsAt: string | null
  endsAt: string | null
  active: boolean
  showPopup: boolean
  showSlider: boolean
  bgColor: string
  ctaLabel: string
}

export type Coupon = {
  code: string
  percent: number
  label: string
  active: boolean
  createdAt?: string
}

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export type AdminProduct = {
  id: string
  name: string
  category: string
  price: number
  originalPrice: number
  costPrice?: number
  stock: number
  rating: number
  reviews: number
  badge: string
  description: string
  fabric: string
  delivery: string
  colors: string[]
  sizes: string[]
  gallery: string[]
  image: string
  inStock: boolean
  featured: boolean
  variants?: AdminVariant[]
}

export type AdminVariant = {
  id: string
  label: string
  color?: string
  size?: string
  price: number
  stock: number
  image?: string
  inStock: boolean
}

export type Stats = {
  revenue: number
  profit: number
  cogs: number
  discounts: number
  orderCount: number
  cancelledCount: number
  productCount: number
  customerCount: number
  avgOrderValue: number
  salesByMonth: { label: string; revenue: number; orders: number }[]
  popular: { product: AdminProduct; sold: number }[]
  lowStock: { id: string; name: string; stock: number }[]
  recentOrders: Order[]
}

export type Staff = {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
  createdAt: string
}

export type AdminQuestion = {
  id: string
  productId: string
  productName: string
  name: string
  question: string
  answer: string | null
  createdAt: string
}

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  address: string
  orderCount: number
  totalSpent: number
  createdAt: string
}

export type AdminReview = {
  id: string
  productId: string
  productName: string
  name: string
  rating: number
  title: string
  text: string
  images: string[]
  verified: boolean
  hidden: boolean
  createdAt: string
}

export type InventoryRow = {
  productId: string
  productName: string
  variantId?: string
  label?: string
  sku?: string
  stock: number
  price: number
  image: string
}

export type Inventory = {
  threshold: number
  rows: InventoryRow[]
  summary: { skuCount: number; outOfStock: number; lowStock: number }
}

export type RefundAction = 'approve' | 'reject' | 'refund'

export type ProductInput = {
  id?: string
  name: string
  category: string
  price: number
  originalPrice: number
  costPrice: number
  stock: number
  badge: string
  description: string
  fabric: string
  delivery: string
  colors: string[]
  sizes: string[]
  gallery: string[]
  image: string
  inStock: boolean
  featured: boolean
  variants?: VariantInput[]
}

export type VariantInput = {
  label: string
  color?: string
  size?: string
  price: number
  stock: number
  image?: string
  sku?: string
}

// Bulk import (CSV / Excel / PDF)
export type ImportRowPreview = {
  row: number
  valid: boolean
  action: 'create' | 'update' | 'skip'
  id: string
  data: ProductInput & Record<string, unknown>
  errors: string[]
}
export type ImportPreview = {
  rows: ImportRowPreview[]
  summary: { total: number; valid: number; invalid: number; toCreate: number; toUpdate: number }
}
export type ImportResult = {
  created: number
  updated: number
  failed: { name: string; error: string }[]
}

// Reports
export type ReportRow = { id: string; name: string; category: string; qty: number; revenue: number; profit: number }
export type CategoryRow = { category: string; qty: number; revenue: number; profit: number }
export type Report = {
  range: { from: string; to: string }
  summary: {
    orderCount: number; unitsSold: number; productSales: number; cogs: number
    grossProfit: number; margin: number; orderTotal: number; discounts: number; avgOrderValue: number
  }
  byProduct: ReportRow[]
  byCategory: CategoryRow[]
}

export const admin = {
  stats: () => api.get<Stats>('/admin/stats'),

  report: (from?: string, to?: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const s = qs.toString()
    return api.get<Report>(`/admin/reports${s ? `?${s}` : ''}`)
  },

  listOrders: (params: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.status && params.status !== 'All') qs.set('status', params.status)
    if (params.q) qs.set('q', params.q)
    const s = qs.toString()
    return api.get<{ orders: Order[]; counts: Record<string, number>; total: number }>(
      `/admin/orders${s ? `?${s}` : ''}`,
    )
  },

  updateOrderStatus: (id: string, status: OrderStatus) =>
    patch<{ order: Order }>(`/admin/orders/${id}/status`, { status }),

  setPaymentVerified: (id: string, verified: boolean) =>
    patch<{ order: Order }>(`/admin/orders/${id}/payment`, { verified }),

  // Count of orders still in "Processing" — polled for the sidebar badge.
  pendingOrderCount: () => api.get<{ count: number }>('/admin/orders/pending-count'),

  // Bulk status change for the selected orders.
  bulkOrderStatus: (ids: string[], status: OrderStatus) =>
    patch<{ updated: number }>('/admin/orders/bulk-status', { ids, status }),

  // CSV exports (download a Blob). kind: 'orders' | 'customers' | 'products'.
  async exportCsv(kind: 'orders' | 'customers' | 'products'): Promise<void> {
    const res = await fetch(`${BASE}/admin/export/${kind}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bowandtie-${kind}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  getOrder: (id: string) => api.get<{ order: Order }>(`/admin/orders/${id}`),
  shipOrder: (id: string, provider: 'pathao' | 'steadfast' | 'redx') =>
    api.post<{ order: Order; tracking: { trackingCode: string; mock: boolean } }>(`/admin/orders/${id}/ship`, { provider }),

  listProducts: () => api.get<{ products: AdminProduct[] }>('/admin/products'),
  createProduct: (data: ProductInput) => api.post<{ product: AdminProduct }>('/admin/products', data),
  updateProduct: (id: string, data: ProductInput) =>
    api.put<{ product: AdminProduct }>(`/admin/products/${id}`, data),
  deleteProduct: (id: string) => api.del<{ ok: boolean }>(`/admin/products/${id}`),

  listCustomers: () => api.get<{ customers: Customer[] }>('/admin/customers'),

  // Staff & permissions
  listStaff: () => api.get<{ staff: Staff[]; sections: string[] }>('/admin/staff'),
  createStaff: (data: { name: string; email: string; password: string; permissions: string[] }) =>
    api.post<{ staff: Staff }>('/admin/staff', data),
  updateStaff: (id: string, data: { name?: string; permissions?: string[]; password?: string }) =>
    api.put<{ staff: Staff }>(`/admin/staff/${id}`, data),
  deleteStaff: (id: string) => api.del<{ ok: boolean }>(`/admin/staff/${id}`),

  // Product Q&A
  listQuestions: () => api.get<{ questions: AdminQuestion[] }>('/admin/questions'),
  answerQuestion: (id: string, answer: string) =>
    api.put<{ question: { id: string; answer: string } }>(`/admin/questions/${id}`, { answer }),
  deleteQuestion: (id: string) => api.del<{ ok: boolean }>(`/admin/questions/${id}`),

  // Returns & refunds
  listReturns: () =>
    api.get<{ returns: Order[]; counts: Record<string, number> }>('/admin/returns'),
  refundOrder: (id: string, action: RefundAction, extra?: { amount?: number; method?: string }) =>
    patch<{ order: Order }>(`/admin/orders/${id}/refund`, { action, ...extra }),

  // Review moderation
  listReviews: (q?: string) =>
    api.get<{ reviews: AdminReview[] }>(`/admin/reviews${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  toggleReview: (id: string, hidden: boolean) =>
    patch<{ ok: boolean; hidden: boolean }>(`/admin/reviews/${id}`, { hidden }),
  deleteReview: (id: string) => api.del<{ ok: boolean }>(`/admin/reviews/${id}`),

  // Inventory
  listInventory: (threshold?: number) =>
    api.get<Inventory>(`/admin/inventory${threshold != null ? `?threshold=${threshold}` : ''}`),

  // Promotions
  listPromotions: () => api.get<{ promotions: Promotion[] }>('/admin/promotions'),
  createPromotion: (data: PromotionInput) => api.post<{ promotion: Promotion }>('/admin/promotions', data),
  updatePromotion: (id: string, data: PromotionInput) =>
    api.put<{ promotion: Promotion }>(`/admin/promotions/${id}`, data),
  deletePromotion: (id: string) => api.del<{ ok: boolean }>(`/admin/promotions/${id}`),

  // Coupons
  listCoupons: () => api.get<{ coupons: Coupon[] }>('/admin/coupons'),
  createCoupon: (data: { code: string; percent: number; label: string }) =>
    api.post<{ coupon: Coupon }>('/admin/coupons', data),
  toggleCoupon: (code: string, active: boolean) =>
    api.put<{ coupon: Coupon }>(`/admin/coupons/${code}`, { active }),
  deleteCoupon: (code: string) => api.del<{ ok: boolean }>(`/admin/coupons/${code}`),

  async uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch(`${BASE}/admin/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Upload failed')
    return (data as { url: string }).url
  },

  // Bulk import: upload a CSV/Excel/PDF and get a validated preview (nothing saved yet).
  async importProducts(file: File): Promise<ImportPreview> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/admin/products/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Import failed')
    return data as ImportPreview
  },

  // Commit the confirmed rows to the store.
  commitImport: (rows: unknown[]) =>
    api.post<ImportResult>('/admin/products/import/commit', { rows }),

  // Storefront settings (bKash/Nagad merchant numbers)
  getSettings: () => api.get<StoreSettings>('/admin/settings'),
  updateSettings: (data: Partial<StoreSettings>) => api.put<StoreSettings>('/admin/settings', data),
}

export type StoreSettings = { bkashNumber: string; nagadNumber: string }

// Minimal PATCH helper (the shared api client only exposes get/post/put/del).
async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed')
  return data as T
}
