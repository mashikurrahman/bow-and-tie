// ---------------------------------------------------------------------------
// Data service — talks to the real backend API (Node + Express + Prisma).
// Types are kept identical to what the UI already consumes.
// ---------------------------------------------------------------------------
import { api, clearToken, setToken } from './api'

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
  addresses: Address[]
  createdAt: string
}

export type OrderItem = {
  productId: string | null
  name: string
  image: string
  price: number
  quantity: number
  color?: string
  size?: string
}

export type OrderStatus = 'Processing' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled'

export type Order = {
  id: string
  userId: string | null
  items: OrderItem[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  customer: Address
  payment: 'cod' | 'bkash' | 'nagad'
  txnId?: string
  notes?: string
  promoCode?: string
  status: OrderStatus
  createdAt: string
  timeline: { status: OrderStatus; at: string }[]
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
}

// ----- Orders -------------------------------------------------------------
export type CreateOrderInput = {
  items: { productId: string; quantity: number; color?: string; size?: string }[]
  customer: { name: string; phone: string; address: string; city: string }
  payment: 'cod' | 'bkash' | 'nagad'
  txnId?: string
  notes?: string
  promoCode?: string
}

export const orders = {
  async create(input: CreateOrderInput): Promise<Order> {
    const { order } = await api.post<{ order: Order }>('/orders', input)
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
