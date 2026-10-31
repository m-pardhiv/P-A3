import nodemailer from 'nodemailer'
import { env } from './env'

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

export async function sendMail(message: { to: string; subject: string; text: string }) {
  if (transport) {
    await transport.sendMail({ from: env.MAIL_FROM, ...message })
    return
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMTP_HOST is not configured')
  }
  console.info(`[mail] To: ${message.to}\n[mail] Subject: ${message.subject}\n${message.text}`)
}
