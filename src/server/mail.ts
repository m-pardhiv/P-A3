import nodemailer from 'nodemailer'
import { env } from './env'
import { type Message, sendViaResend } from './resend'

// Resend wins when its key is set. Otherwise SMTP, and with neither, development prints the email.
const transport =
  !env.RESEND_API_KEY && env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    : null

export async function sendMail(message: Message) {
  if (env.RESEND_API_KEY) {
    await sendViaResend({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM }, message)
    return
  }
  if (transport) {
    await transport.sendMail({ from: env.MAIL_FROM, ...message })
    return
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('No email provider is configured. Set RESEND_API_KEY or SMTP_HOST.')
  }
  console.info(`[mail] To: ${message.to}\n[mail] Subject: ${message.subject}\n${message.text}`)
}
