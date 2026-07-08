import type { Address, User } from '@prisma/client'

export function serializeUser(user: User & { addresses?: Address[] }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
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
