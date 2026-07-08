import { api } from './api'
import type { Product } from '../data'

export type Promotion = {
  id: string
  title: string
  description: string
  percent: number
  scope: 'all' | 'selected'
  productIds: string[]
  startsAt: string | null
  endsAt: string | null
  active: boolean
  live: boolean
  showPopup: boolean
  showSlider: boolean
  bgColor: string
  ctaLabel: string
  createdAt: string
}

export const promotions = {
  active: () => api.get<{ promotions: Promotion[] }>('/promotions/active'),
  get: (id: string) => api.get<{ promotion: Promotion; products: Product[] }>(`/promotions/${id}`),
}
