import { createApp } from './app'
import { config } from './config'
import { prisma } from './prisma'
import { startAbandonedCartSweeper } from './lib/abandonedCart'
import { startWhatsAppScheduler } from './lib/whatsapp'

async function start() {
  // Fail fast if the database is unreachable.
  await prisma.$connect()
  const app = createApp()
  app.listen(config.port, () => {
    console.log(`🎀 Bow & Tie API running at http://localhost:${config.port}`)
    console.log(`   Health: http://localhost:${config.port}/api/health`)
  })
  // Background: cart reminders + weekly/monthly WhatsApp sales reports.
  startAbandonedCartSweeper()
  startWhatsAppScheduler()
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
