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

  // Demo admin + customer accounts
  const adminPass = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@bowclips.com' },
    update: {},
    create: { name: 'Store Admin', email: 'admin@bowclips.com', password: adminPass, role: 'admin' },
  })

  const demoPass = await bcrypt.hash('demo123', 10)
  await prisma.user.upsert({
    where: { email: 'demo@bowclips.com' },
    update: {},
    create: { name: 'Demo Customer', email: 'demo@bowclips.com', password: demoPass, role: 'customer' },
  })

  const productCount = await prisma.product.count()
  console.log(`Seed complete: ${productCount} products, ${promoSeed.length} promos, 2 demo users.`)
  console.log('  Admin login:    admin@bowclips.com / admin123')
  console.log('  Customer login: demo@bowclips.com  / demo123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
