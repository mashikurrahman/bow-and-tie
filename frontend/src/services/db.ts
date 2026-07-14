// ---------------------------------------------------------------------------
// Data service — talks to the real backend API (Node + Express + Prisma).
// Types are kept identical to what the UI already consumes.
// ---------------------------------------------------------------------------
import { api, clearToken, getToken, setToken } from './api'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export type Address = {
  id?: string
  label?: string
  name: string
  phone: string
  address: string
  city: string
}

export type User = {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  permissions?: string[]
  emailVerified?: boolean
  addresses: Address[]
  createdAt: string
}

export type OrderItem = {
  productId: string | null
  variantId?: string
  name: string
  image: string
  price: number
  quantity: number
  color?: string
  size?: string
}

export type OrderStatus =
  | 'Processing'
  | 'Confirmed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Return Requested'
  | 'Returned'

export type Order = {
  id: string
  userId: string | null
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  customer: Address
  deliveryZone?: 'inside' | 'outside'
  courier?: string
  trackingCode?: string
  payment: 'cod' | 'bkash' | 'nagad'
  txnId?: string
  paymentVerified?: boolean
  giftWrap?: boolean
  giftMessage?: string
  notes?: string
  promoCode?: string
  status: OrderStatus
  returnReason?: string
  refundStatus?: 'Requested' | 'Approved' | 'Rejected' | 'Refunded'
  refundAmount?: number
  refundMethod?: 'bkash' | 'nagad' | 'cash' | 'original'
  refundedAt?: string
  createdAt: string
  timeline: { status: string; at: string }[]
}

export const ORDER_FLOW: OrderStatus[] = ['Processing', 'Confirmed', 'Shipped', 'Delivered']

// ----- Auth ---------------------------------------------------------------
export const auth = {
  async register(input: { name: string; email: string; password: string }): Promise<User> {
    const { token, user } = await api.post<{ token: string; user: User }>('/auth/register', input)
    setToken(token)
    return user
  },

  async login(email: string, password: string): Promise<User> {
    const { token, user } = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    })
    setToken(token)
    return user
  },

  async oauth(provider: 'google' | 'facebook', providerToken: string): Promise<User> {
    const { token, user } = await api.post<{ token: string; user: User }>('/auth/oauth', {
      provider,
      token: providerToken,
    })
    setToken(token)
    return user
  },

  logout() {
    clearToken()
  },

  /** Load the current user from a stored token (used on app start). */
  async me(): Promise<User | null> {
    try {
      const { user } = await api.get<{ user: User }>('/auth/me')
      return user
    } catch {
      clearToken()
      return null
    }
  },

  async updateProfile(patch: { name?: string; phone?: string }): Promise<User> {
    const { user } = await api.put<{ user: User }>('/account/profile', patch)
    return user
  },

  async saveAddress(address: Address): Promise<User> {
    const { user } = await api.post<{ user: User }>('/account/addresses', address)
    return user
  },

  async removeAddress(addressId: string): Promise<User> {
    const { user } = await api.del<{ user: User }>(`/account/addresses/${addressId}`)
    return user
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.put('/account/password', { oldPassword, newPassword })
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  },

  async resetPassword(id: string, token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { id, token, password })
  },

  /** Confirm an email from the link; returns the now-verified, signed-in user. */
  async verifyEmail(id: string, token: string): Promise<User> {
    const { token: authToken, user } = await api.post<{ token: string; user: User }>('/auth/verify-email', { id, token })
    setToken(authToken)
    return user
  },

  /** Resend the verification email to the logged-in user. */
  async resendVerification(): Promise<void> {
    await api.post('/auth/resend-verification')
  },
}

// ----- Orders -------------------------------------------------------------
export type CreateOrderInput = {
  items: { productId: string; variantId?: string; quantity: number; color?: string; size?: string }[]
  customer: { name: string; email?: string; phone: string; address: string; city: string }
  deliveryZone?: 'inside' | 'outside'
  payment: 'cod' | 'bkash' | 'nagad'
  txnId?: string
  giftWrap?: boolean
  giftMessage?: string
  notes?: string
  promoCode?: string
}

export const orders = {
  async create(input: CreateOrderInput): Promise<Order> {
    const { order } = await api.post<{ order: Order }>('/orders', input)
    return order
  },

  async cancel(id: string): Promise<Order> {
    const { order } = await api.post<{ order: Order }>(`/orders/${id}/cancel`)
    return order
  },

  async requestReturn(id: string, reason?: string): Promise<Order> {
    const { order } = await api.post<{ order: Order }>(`/orders/${id}/return`, { reason })
    return order
  },

  async listMine(): Promise<Order[]> {
    const res = await api.get<{ orders: Order[] }>('/orders/mine')
    return res.orders
  },

  async getMine(id: string): Promise<Order | null> {
    try {
      const { order } = await api.get<{ order: Order }>(`/orders/${id}`)
      return order
    } catch {
      return null
    }
  },

  async track(id: string): Promise<Order | null> {
    try {
      const { order } = await api.get<{ order: Order }>(`/orders/track/${id}`)
      return order
    } catch {
      return null
    }
  },
}

// ----- Reviews ------------------------------------------------------------
export type Review = {
  name: string
  rating: number
  title: string
  date: string
  text: string
  images: string[]
  verified: boolean
}

export const reviews = {
  async list(productId: string): Promise<Review[]> {
    const { reviews } = await api.get<{ reviews: Review[] }>(`/products/${productId}/reviews`)
    return reviews
  },
  async add(
    productId: string,
    input: { rating: number; title: string; text: string; images: string[] },
  ): Promise<Review[]> {
    const { reviews } = await api.post<{ reviews: Review[] }>(`/products/${productId}/reviews`, input)
    return reviews
  },
  // Upload a review photo (any logged-in customer) -> returns its URL.
  async uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Upload failed')
    return (data as { url: string }).url
  },
}

// ----- Product Q&A --------------------------------------------------------
export type Question = { id: string; name: string; question: string; answer: string | null; date: string }

export const questions = {
  async list(productId: string): Promise<Question[]> {
    const { questions } = await api.get<{ questions: Question[] }>(`/products/${productId}/questions`)
    return questions
  },
  async ask(productId: string, question: string): Promise<void> {
    await api.post(`/products/${productId}/questions`, { question })
  },
}

// ----- Back-in-stock alerts ----------------------------------------------
export const stockAlerts = {
  async notifyMe(productId: string, email: string): Promise<void> {
    await api.post(`/products/${productId}/notify-me`, { email })
  },
}

// ----- Abandoned-cart tracking -------------------------------------------
export const cartTracking = {
  async track(input: {
    email?: string
    items: { name: string; quantity: number; price: number; image?: string }[]
    total: number
  }): Promise<void> {
    try {
      await api.post('/cart/track', input)
    } catch {
      /* non-critical — ignore */
    }
  },
}

// ----- Coupons ------------------------------------------------------------
export const coupons = {
  /** Validate a checkout code against the live coupon table; null if invalid. */
  async validate(code: string): Promise<{ code: string; rate: number } | null> {
    try {
      return await api.get<{ code: string; rate: number; label?: string }>(
        `/promotions/coupon/${encodeURIComponent(code.trim().toUpperCase())}`,
      )
    } catch {
      return null
    }
  },
}

// ----- Storefront settings ------------------------------------------------
export type PublicSettings = {
  bkashNumber: string
  nagadNumber: string
  heroTitle?: string
  heroSubtitle?: string
  heroCtaLabel?: string
  heroCtaLink?: string
  heroImage?: string
}

export const settings = {
  /** Public storefront settings (e.g. the bKash/Nagad numbers for checkout). */
  async get(): Promise<PublicSettings> {
    try {
      return await api.get<PublicSettings>('/settings')
    } catch {
      return { bkashNumber: '', nagadNumber: '' }
    }
  },
}

// ----- Bundles ("complete the look" sets) ---------------------------------
export type Bundle = {
  id: string
  title: string
  description: string
  image: string
  products: { id: string; name: string; price: number; image: string }[]
}

export const bundles = {
  async list(): Promise<Bundle[]> {
    try {
      const { bundles } = await api.get<{ bundles: Bundle[] }>('/bundles')
      return bundles
    } catch {
      return []
    }
  },
}

// ----- Newsletter ---------------------------------------------------------
export const newsletter = {
  async subscribe(email: string): Promise<{ code: string }> {
    return api.post<{ ok: boolean; code: string }>('/newsletter/subscribe', { email })
  },
}
