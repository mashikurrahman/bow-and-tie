import { config } from '../config'
import type { MailInput } from './mailer'

// Branded HTML email templates (rose theme to match the storefront).

const ROSE = '#c9527a'
const money = (n: number) => `৳${n.toLocaleString('en-US')}`
const store = config.storeName
const app = config.appUrl.replace(/\/$/, '')
const paymentLabel = (p: string) =>
  p === 'cod' ? 'Cash on Delivery' : p === 'bkash' ? 'bKash' : p === 'nagad' ? 'Nagad' : p.toUpperCase()

function layout(heading: string, body: string, preheader = ''): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf7f8;font-family:'Segoe UI',Arial,sans-serif;color:#2b2530;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(40,20,30,.06);">
        <tr><td style="background:linear-gradient(135deg,${ROSE},#a63c60);padding:26px 30px;">
          <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:.02em;">${store}</div>
          <div style="color:rgba(255,255,255,.85);font-size:12px;letter-spacing:.14em;text-transform:uppercase;">Handcrafted Bows &amp; Accessories</div>
        </td></tr>
        <tr><td style="padding:30px;">
          <h1 style="margin:0 0 14px;font-size:20px;color:#2b2530;">${heading}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:20px 30px;background:#fbeef2;color:#7a7080;font-size:12px;text-align:center;">
          You’re receiving this because you shopped with ${store}.<br>
          <a href="${app}" style="color:${ROSE};text-decoration:none;">${app.replace(/^https?:\/\//, '')}</a> · Dhaka, Bangladesh
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${ROSE};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:14px;">${label}</a>`

// A marketing broadcast to newsletter subscribers. The admin-authored body is
// plain text; blank lines become paragraphs. Wrapped in the branded layout.
export function campaignEmail(to: string, subject: string, body: string): MailInput {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4a444c;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  const cta = button(app, `Shop ${store}`)
  return {
    to,
    subject,
    html: layout(subject, `${paragraphs}<div style="margin-top:8px;">${cta}</div>`, subject),
    text: body,
  }
}

export interface OrderEmailData {
  id: string
  items: { name: string; quantity: number; price: number }[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  customerName: string
  customerAddress: string
  customerCity: string
  payment: string
}

function orderTable(o: OrderEmailData): string {
  const rows = o.items
    .map(
      (it) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0e7eb;">${it.name} <span style="color:#9a929c;">× ${it.quantity}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #f0e7eb;text-align:right;white-space:nowrap;">${money(it.price * it.quantity)}</td>
      </tr>`,
    )
    .join('')
  const line = (label: string, val: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? 'font-weight:700;font-size:16px;' : 'color:#7a7080;'}">${label}</td>
     <td style="padding:4px 0;text-align:right;${bold ? 'font-weight:700;font-size:16px;color:' + ROSE : 'color:#7a7080;'}">${val}</td></tr>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 4px;">
    ${rows}
    <tr><td colspan="2" style="height:8px;"></td></tr>
    ${line('Subtotal', money(o.subtotal))}
    ${o.discount ? line('Discount', '−' + money(o.discount)) : ''}
    ${line('Shipping', o.shipping === 0 ? 'Free' : money(o.shipping))}
    ${line('Total', money(o.total), true)}
  </table>`
}

export function orderConfirmationEmail(to: string, o: OrderEmailData): MailInput {
  const paid = o.payment === 'cod'
    ? `Amount payable on delivery: <b>${money(o.total)}</b>`
    : `Paid via <b>${paymentLabel(o.payment)}</b>`
  const body = `
    <p style="font-size:14px;line-height:1.6;">Hi ${o.customerName}, thank you for your order! 🎀 We’ve received it and will start preparing it right away. Your invoice is below.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#7a7080;margin:4px 0 10px;">
      <tr>
        <td style="vertical-align:top;">
          <div style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:#9a929c;">Invoice</div>
          <div style="color:${ROSE};font-weight:700;font-size:15px;">#${o.id}</div>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <div>${paymentLabel(o.payment)}</div>
          <div>Ship to: ${o.customerAddress}, ${o.customerCity}</div>
        </td>
      </tr>
    </table>
    ${orderTable(o)}
    <p style="font-size:13px;color:#7a7080;margin:12px 0 4px;">${paid}</p>
    <div style="margin:22px 0 6px;">${button(`${app}/orders/${o.id}/invoice`, 'View / download invoice')}</div>
    <p style="font-size:13px;margin:10px 0 0;"><a href="${app}/track" style="color:${ROSE};text-decoration:none;">Track your order →</a></p>`
  return { to, subject: `Your invoice for order ${o.id} · ${store}`, html: layout('Your order is confirmed! 🎀', body, `Invoice for order ${o.id}`) }
}

export function orderStatusEmail(to: string, o: OrderEmailData, status: string): MailInput {
  const messages: Record<string, string> = {
    Confirmed: 'Good news — your order has been confirmed and is being prepared. ✅',
    Shipped: 'Your order is on its way! 🚚 It has been handed over for delivery.',
    Delivered: 'Your order has been delivered. We hope you love it! 💝 Consider leaving a review.',
    Cancelled: 'Your order has been cancelled. If this is a mistake, please contact us.',
    'Return Approved': 'Your return request has been approved. Please send the item(s) back and we’ll process your refund. 📦',
    'Return Rejected': 'We’re sorry — your return request could not be approved. Please contact us if you have questions.',
    Refunded: 'Your refund has been processed. 💸 It should reach you shortly via your chosen method.',
  }
  const msg = messages[status] ?? `Your order status has been updated to “${status}”.`
  const body = `
    <p style="font-size:14px;line-height:1.6;">Hi ${o.customerName}, ${msg}</p>
    <p style="font-size:14px;margin:6px 0 14px;"><b>Order number:</b> <span style="color:${ROSE};font-weight:700;">${o.id}</span> · Status: <b>${status}</b></p>
    ${orderTable(o)}
    <div style="margin:22px 0 6px;">${button(`${app}/track`, 'View order')}</div>`
  return { to, subject: `Order ${o.id} — ${status} · ${store}`, html: layout(`Order update: ${status}`, body, `Your order is now ${status}`) }
}

export function verificationEmail(to: string, name: string, verifyUrl: string): MailInput {
  const body = `
    <p style="font-size:14px;line-height:1.6;">Hi ${name}, welcome to ${store}! 🎀 One quick step — please confirm this is your email address.</p>
    <p style="font-size:14px;line-height:1.6;">Verifying helps us keep your account secure and make sure order updates reach you.</p>
    <div style="margin:22px 0 10px;">${button(verifyUrl, 'Verify my email')}</div>
    <p style="font-size:12px;color:#9a929c;">This link expires in 24 hours. If you didn’t create an account, you can ignore this email.</p>
    <p style="font-size:12px;color:#9a929c;word-break:break-all;">Or paste this link: ${verifyUrl}</p>`
  return { to, subject: `Confirm your email · ${store}`, html: layout('Confirm your email', body, 'Verify your email to finish signing up') }
}

export function welcomeEmail(to: string, name: string): MailInput {
  const body = `
    <p style="font-size:14px;line-height:1.6;">Hi ${name}, welcome to ${store}! 🎀 We’re so glad you’re here.</p>
    <p style="font-size:14px;line-height:1.6;">Explore our handcrafted bows, clips and accessories — new pieces drop regularly, and members are first to know about seasonal sales.</p>
    <div style="margin:20px 0 6px;">${button(`${app}/shop`, 'Start shopping')}</div>`
  return { to, subject: `Welcome to ${store}! 🎀`, html: layout(`Welcome, ${name}!`, body, 'Welcome to the family') }
}

export function passwordResetEmail(to: string, name: string, resetUrl: string): MailInput {
  const body = `
    <p style="font-size:14px;line-height:1.6;">Hi ${name}, we received a request to reset your ${store} password.</p>
    <p style="font-size:14px;line-height:1.6;">Click below to choose a new password. This link expires in 1 hour. If you didn’t request this, you can safely ignore this email.</p>
    <div style="margin:20px 0 10px;">${button(resetUrl, 'Reset my password')}</div>
    <p style="font-size:12px;color:#9a929c;word-break:break-all;">Or paste this link: ${resetUrl}</p>`
  return { to, subject: `Reset your ${store} password`, html: layout('Reset your password', body, 'Password reset link') }
}

export function abandonedCartEmail(
  to: string,
  items: { name: string; quantity: number; price: number }[],
): MailInput {
  const rows = items
    .map(
      (it) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f0e7eb;">${it.name} <span style="color:#9a929c;">× ${it.quantity}</span></td>
         <td style="padding:8px 0;border-bottom:1px solid #f0e7eb;text-align:right;">${money(it.price * it.quantity)}</td></tr>`,
    )
    .join('')
  const body = `
    <p style="font-size:14px;line-height:1.6;">You left something lovely behind! 🎀 Your cart is saved and ready whenever you are.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 4px;">${rows}</table>
    <div style="margin:22px 0 6px;">${button(`${app}/cart`, 'Complete your order')}</div>`
  return { to, subject: `You left something in your cart 🎀 · ${store}`, html: layout('Still thinking it over?', body, 'Your cart is waiting') }
}

export function newsletterWelcomeEmail(to: string, couponCode: string, percent: number): MailInput {
  const body = `
    <p style="font-size:14px;line-height:1.6;">Thanks for subscribing to ${store}! 🎀 You’ll be first to hear about new collections and seasonal sales.</p>
    <p style="font-size:14px;line-height:1.6;">As a welcome gift, here’s <b>${percent}% off</b> your first order:</p>
    <div style="text-align:center;margin:16px 0;">
      <span style="display:inline-block;border:2px dashed ${ROSE};color:${ROSE};font-weight:800;font-size:20px;letter-spacing:2px;padding:12px 26px;border-radius:10px;">${couponCode}</span>
    </div>
    <div style="margin:16px 0 6px;text-align:center;">${button(`${app}/shop`, 'Shop now')}</div>`
  return { to, subject: `Welcome — here’s ${percent}% off 🎀`, html: layout('Welcome to the list!', body, `${percent}% off inside`) }
}

export function backInStockEmail(to: string, productName: string, productUrl: string): MailInput {
  const body = `
    <p style="font-size:14px;line-height:1.6;">Good news! <b>${productName}</b> is back in stock at ${store}. 🎉</p>
    <p style="font-size:14px;line-height:1.6;">Popular pieces sell out fast, so grab yours before it’s gone again.</p>
    <div style="margin:20px 0 6px;">${button(productUrl, 'Shop it now')}</div>`
  return { to, subject: `Back in stock: ${productName} · ${store}`, html: layout('It’s back! 🎉', body, `${productName} is available again`) }
}
