import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { productSeed, promoSeed } from './seed-data'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database…')

  // Promos
  for (const p of promoSeed) {
    await prisma.promo.upsert({ where: { code: p.code }, update: { rate: p.rate }, create: p })
  }

  // Products (+ reviews)
  for (const p of productSeed) {
    const { reviews, colors, sizes, gallery, ...rest } = p
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...rest,
        colors: JSON.stringify(colors),
        sizes: JSON.stringify(sizes),
        gallery: JSON.stringify(gallery),
        reviews: { create: reviews },
      },
    })
  }

  // Admin account. On a public server, set ADMIN_EMAIL + ADMIN_PASSWORD so the
  // admin panel is NOT protected by the well-known demo credentials. When those
  // env vars are set the password is (re)applied on every seed, so you can
  // rotate it by changing the env and re-running. In dev they default to the
  // demo login for convenience.
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@bowclips.com').toLowerCase()
  const adminPlain = process.env.ADMIN_PASSWORD ?? 'admin123'
  const adminPass = await bcrypt.hash(adminPlain, 10)
  const customAdmin = Boolean(process.env.ADMIN_PASSWORD)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: customAdmin ? { password: adminPass, role: 'admin', emailVerified: true } : { emailVerified: true },
    create: { name: 'Store Admin', email: adminEmail, password: adminPass, role: 'admin', emailVerified: true },
  })

  // Demo customer — only seeded when NOT using custom admin creds (i.e. dev).
  if (!customAdmin) {
    const demoPass = await bcrypt.hash('demo123', 10)
    await prisma.user.upsert({
      where: { email: 'demo@bowclips.com' },
      update: { emailVerified: true },
      create: { name: 'Demo Customer', email: 'demo@bowclips.com', password: demoPass, role: 'customer', emailVerified: true },
    })
  }

  const productCount = await prisma.product.count()
  console.log(`Seed complete: ${productCount} products, ${promoSeed.length} promos.`)
  console.log(`  Admin login: ${adminEmail} / ${customAdmin ? '(from ADMIN_PASSWORD)' : 'admin123'}`)
  if (!customAdmin) console.log('  Customer login: demo@bowclips.com / demo123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
