import type { Address, User } from '@prisma/client'

const ALL_SECTIONS = [
  'dashboard', 'products', 'inventory', 'import', 'orders', 'returns', 'customers',
  'promotions', 'coupons', 'reports', 'reviews', 'questions', 'settings', 'staff',
]

export function serializeUser(user: User & { addresses?: Address[] }) {
  const permissions =
    user.role === 'admin'
      ? ALL_SECTIONS
      : (() => {
          try {
            const v = JSON.parse(user.permissions || '[]')
            return Array.isArray(v) ? (v as string[]) : []
          } catch {
            return []
          }
        })()
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    permissions,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    addresses: (user.addresses ?? []).map((a) => ({
      id: a.id,
      label: a.label ?? undefined,
      name: a.name,
      phone: a.phone,
      address: a.address,
      city: a.city,
    })),
  }
}
