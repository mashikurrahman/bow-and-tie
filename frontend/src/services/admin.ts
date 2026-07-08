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
}

export const admin = {
  stats: () => api.get<Stats>('/admin/stats'),

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

  listProducts: () => api.get<{ products: AdminProduct[] }>('/admin/products'),
  createProduct: (data: ProductInput) => api.post<{ product: AdminProduct }>('/admin/products', data),
  updateProduct: (id: string, data: ProductInput) =>
    api.put<{ product: AdminProduct }>(`/admin/products/${id}`, data),
  deleteProduct: (id: string) => api.del<{ ok: boolean }>(`/admin/products/${id}`),

  listCustomers: () => api.get<{ customers: Customer[] }>('/admin/customers'),

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
}

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
