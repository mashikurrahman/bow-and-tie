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

/** Send an email. Never throws — failures are logged so they can't break a request. */
export async function sendMail(mail: MailInput): Promise<void> {
  const tx = getTransporter()
  if (!tx) {
    // Dev fallback: no SMTP configured.
    console.log(`\n📧 [email:dev] To: ${mail.to}\n   Subject: ${mail.subject}\n   (configure SMTP_* env vars to actually send)\n`)
    return
  }
  try {
    await tx.sendMail({
      from: config.email.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text ?? stripHtml(mail.html),
    })
  } catch (err) {
    console.error(`📧 Failed to send email to ${mail.to}:`, err instanceof Error ? err.message : err)
  }
}

/** Fire-and-forget: send without blocking the request/response cycle. */
export function sendMailAsync(mail: MailInput): void {
  void sendMail(mail)
}

/**
 * Send and REPORT the outcome (unlike sendMail which swallows errors). Used by
 * the admin email-test endpoint to surface the real SMTP result for diagnosis.
 */
export async function sendMailResult(mail: MailInput): Promise<{ sent: boolean; error?: string }> {
  const tx = getTransporter()
  if (!tx) return { sent: false, error: 'SMTP not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS.' }
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

const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
