import { z } from 'zod'
import { dateSchema, moneySchema, optionalDate, optionalText, requiredId } from './fields'
import { listSearchSchema, paginationSchema } from './pagination'

export const INVOICE_STATUSES = ['draft', 'confirmed', 'paid', 'cancelled'] as const
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque'] as const

const optionalDateFilter = z
  .union([z.literal(''), dateSchema])
  .optional()
  .catch(undefined)

export const invoiceListSchema = listSearchSchema.extend({
  status: z.enum(INVOICE_STATUSES).optional().catch(undefined),
  customerId: z.uuid().optional().catch(undefined),
  subscriptionId: z.uuid().optional().catch(undefined),
  from: optionalDateFilter.transform((value) => value || undefined),
  to: optionalDateFilter.transform((value) => value || undefined),
  overdue: z.boolean().optional().catch(undefined),
})

export const paymentListSchema = paginationSchema.extend({
  method: z.enum(PAYMENT_METHODS).optional().catch(undefined),
  customerId: z.uuid().optional().catch(undefined),
  invoice: z.string().trim().max(40).optional().catch(undefined),
  from: optionalDateFilter.transform((value) => value || undefined),
  to: optionalDateFilter.transform((value) => value || undefined),
})

export const invoiceActionSchema = z.object({
  id: requiredId('Choose an invoice'),
  action: z.enum(['confirm', 'cancel']),
})

export const sendInvoiceSchema = z.object({ id: requiredId('Choose an invoice') })

export const recordPaymentSchema = z.object({
  invoiceId: requiredId('Choose an invoice'),
  method: z.enum(PAYMENT_METHODS, 'Choose a payment method'),
  amount: moneySchema,
  paidOn: dateSchema,
  note: optionalText,
  /** Made when the form loads, so a double click or a retry records one payment. */
  idempotencyKey: z.uuid('Reload the page and try again'),
})

export const runBillingSchema = z.object({ asOf: dateSchema })

export const billingRunsSchema = paginationSchema

export const optionalRangeDate = optionalDate
