import { z } from 'zod'
import { optionalText, requiredId, requiredText } from './fields'
import { paginationSchema } from './pagination'

export const portalListSchema = paginationSchema

export const portalInvoiceListSchema = paginationSchema.extend({
  status: z.enum(['confirmed', 'paid']).optional().catch(undefined),
  overdue: z.boolean().optional().catch(undefined),
})

/** A customer may only pause, resume or close. Everything else is staff work. */
export const portalActionSchema = z.object({
  id: requiredId('Choose a subscription'),
  action: z.enum(['pause', 'resume', 'close']),
})

export const profileSchema = z.object({
  name: requiredText('Enter your name'),
  company: optionalText,
  phone: optionalText,
  address: optionalText,
})
