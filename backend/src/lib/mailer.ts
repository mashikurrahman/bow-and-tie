import nodemailer, { type Transporter } from 'nodemailer'
import { config } from '../config'

// ---------------------------------------------------------------------------
// Transactional email sender.
//
// If SMTP is configured (SMTP_HOST etc. in .env) real emails are sent.
// If not, emails are logged to the console so local development works with
// zero setup and nothing ever crashes because of a missing provider.
// Plug in a free provider later (Brevo / Resend / Gmail) via env vars.
// ---------------------------------------------------------------------------

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!config.email.host) return null // dev mode → console
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
    })
  }
  return transporter
}

export interface MailInput {
  to: string
  subject: string
  html: string
  text?: string
}

// Split an "Name <email>" from-string into the parts Brevo's API expects.
function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1] || config.storeName, email: m[2].trim() }
  return { name: config.storeName, email: from.trim() }
}

// Core delivery. Tries the Brevo HTTP API first (works over HTTPS, so it isn't
// affected by hosts that block outbound SMTP ports); falls back to SMTP; else
// logs to the console for local dev. Returns the outcome so callers can report.
async function deliver(mail: MailInput): Promise<{ sent: boolean; error?: string }> {
  // 1. Brevo transactional HTTP API (recommended on Render — port 443).
  if (config.email.brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.email.brevoApiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: parseFrom(config.email.from),
          to: [{ email: mail.to }],
          subject: mail.subject,
          htmlContent: mail.html,
          textContent: mail.text ?? stripHtml(mail.html),
        }),
      })
      if (res.ok) return { sent: true }
      const body = await res.text().catch(() => '')
      return { sent: false, error: `Brevo API ${res.status}: ${body.slice(0, 300)}` }
    } catch (err) {
      return { sent: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // 2. SMTP fallback (nodemailer) — for local dev or non-Render hosts.
  const tx = getTransporter()
  if (!tx) {
    console.log(`\n📧 [email:dev] To: ${mail.to}\n   Subject: ${mail.subject}\n   (set BREVO_API_KEY or SMTP_* env vars to actually send)\n`)
    return { sent: false, error: 'Email not configured (dev console mode).' }
  }
  try {
    await tx.sendMail({
      from: config.email.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text ?? stripHtml(mail.html),
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Send an email. Never throws — failures are logged so they can't break a request. */
export async function sendMail(mail: MailInput): Promise<void> {
  const r = await deliver(mail)
  if (!r.sent && r.error && !r.error.includes('dev console')) {
    console.error(`📧 Failed to send email to ${mail.to}: ${r.error}`)
  }
}

/** Fire-and-forget: send without blocking the request/response cycle. */
export function sendMailAsync(mail: MailInput): void {
  void sendMail(mail)
}

/** Send and REPORT the outcome (for the admin email-test diagnostic endpoint). */
export async function sendMailResult(mail: MailInput): Promise<{ sent: boolean; error?: string }> {
  return deliver(mail)
}

const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
