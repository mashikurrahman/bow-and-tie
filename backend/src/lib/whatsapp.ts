import { config } from '../config'
import { prisma } from '../prisma'

// ---------------------------------------------------------------------------
// WhatsApp admin alerts via Meta's WhatsApp Cloud API.
//
// If credentials are not configured, messages are logged to the console so
// development works with zero setup (same pattern as the email mailer). Plug in
// WHATSAPP_TOKEN / WHATSAPP_PHONE_ID / WHATSAPP_ADMIN_TO to actually send.
// ---------------------------------------------------------------------------

const money = (n: number) => `৳${n.toLocaleString('en-US')}`

export async function sendWhatsApp(text: string): Promise<void> {
  const { token, phoneId, to } = config.whatsapp
  if (!token || !phoneId || !to) {
    console.log(`\n📱 [whatsapp:dev] To admin:\n${text}\n(set WHATSAPP_* env vars to actually send)\n`)
    return
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    })
    if (!res.ok) console.error('WhatsApp send failed:', res.status, await res.text())
  } catch (err) {
    console.error('WhatsApp error:', err instanceof Error ? err.message : err)
  }
}

export function sendWhatsAppAsync(text: string): void {
  void sendWhatsApp(text)
}

// ---- Alert builders -------------------------------------------------------

export function newOrderAlert(o: {
  id: string
  total: number
  customerName: string
  customerPhone: string
  payment: string
  items: { name: string; quantity: number }[]
}): string {
  const lines = o.items.map((it) => `• ${it.name} ×${it.quantity}`).join('\n')
  return `🎀 *New order ${o.id}*\n${lines}\n\nTotal: *${money(o.total)}* (${o.payment.toUpperCase()})\n${o.customerName} · ${o.customerPhone}`
}

export function lowStockAlert(name: string, stock: number): string {
  return `⚠️ *Low stock:* ${name} — only ${stock} left. Time to restock.`
}

export function restockAlert(name: string, stock: number): string {
  return `📦 *Back in stock:* ${name} is now available (${stock} in stock).`
}

// ---- Periodic sales reports ----------------------------------------------

export async function buildSalesReport(sinceDays: number, label: string): Promise<string> {
  const since = new Date(Date.now() - sinceDays * 86400000)
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: 'Cancelled' } },
    include: { items: true },
  })
  const revenue = orders.reduce((s, o) => s + o.total, 0)
  const units = new Map<string, number>()
  for (const o of orders) for (const it of o.items) units.set(it.name, (units.get(it.name) ?? 0) + it.quantity)
  const top = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const topLines = top.length ? top.map(([n, q]) => `• ${n} (${q})`).join('\n') : '—'
  return `📊 *${label} sales report*\nOrders: ${orders.length}\nRevenue: *${money(revenue)}*\nAvg order: ${money(orders.length ? Math.round(revenue / orders.length) : 0)}\n\nTop sellers:\n${topLines}`
}

export async function sendWeeklyReport(): Promise<void> {
  sendWhatsAppAsync(await buildSalesReport(7, 'Weekly'))
}
export async function sendMonthlyReport(): Promise<void> {
  sendWhatsAppAsync(await buildSalesReport(30, 'Monthly'))
}

// ---- Scheduler ------------------------------------------------------------
// Checks hourly; sends the weekly report Monday ~9am and the monthly report on
// the 1st ~9am. Tracks the last send so it fires once per period.
let lastWeekly = ''
let lastMonthly = ''
let timer: NodeJS.Timeout | null = null

async function tick() {
  const now = new Date()
  const dayKey = now.toISOString().slice(0, 10)
  if (now.getHours() === 9) {
    if (now.getDay() === 1 && lastWeekly !== dayKey) {
      lastWeekly = dayKey
      await sendWeeklyReport()
    }
    if (now.getDate() === 1 && lastMonthly !== dayKey) {
      lastMonthly = dayKey
      await sendMonthlyReport()
    }
  }
}

export function startWhatsAppScheduler(): void {
  if (timer) return
  timer = setInterval(() => void tick().catch(() => {}), 60 * 60 * 1000) // hourly
  timer.unref?.()
}
