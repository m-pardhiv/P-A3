import { config } from 'dotenv'
import { z } from 'zod'

config({ quiet: true })

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required. Copy .env.example to .env.'),
  APP_URL: z.url().default('http://localhost:3000'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Brightloop <billing@brightloop.example>'),
})

export const env = schema.parse(process.env)
