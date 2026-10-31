import { z } from 'zod'
import {
  dateSchema,
  optionalDate,
  optionalId,
  requiredId,
  requiredText,
  wholeNumber,
} from './fields'
import { listSearchSchema } from './pagination'

export const SUBSCRIPTION_STATUSES = [
  'draft',
  'quotation',
  'confirmed',
  'active',
  'paused',
  'closed',
] as const

export const SUBSCRIPTION_ACTIONS = [
  'send',
  'confirm',
  'activate',
  'pause',
  'resume',
  'close',
  'renew',
] as const

const lineSchema = z.object({
  id: optionalId,
  productId: requiredId('Choose a product'),
  variantId: optionalId,
  quantity: wholeNumber(1, 'Enter at least 1'),
})

export const templateSchema = z.object({
  id: optionalId,
  name: requiredText('Enter a template name'),
  planId: requiredId('Choose a plan'),
  paymentTermId: requiredId('Choose payment terms'),
  validityDays: wholeNumber(1, 'Enter at least 1 day'),
  lines: z.array(lineSchema),
})

export const createSubscriptionSchema = z
  .object({
    customerId: requiredId('Choose a customer'),
    planId: requiredId('Choose a plan'),
    templateId: optionalId,
    paymentTermId: requiredId('Choose payment terms'),
    startDate: dateSchema,
    expiryDate: optionalDate,
    planQuantity: wholeNumber(1, 'Enter at least 1'),
    lines: z.array(lineSchema),
  })
  .refine((s) => !s.expiryDate || s.expiryDate >= s.startDate, {
    path: ['expiryDate'],
    message: 'The expiry date cannot be before the start date',
  })

export const updateLinesSchema = z.object({
  id: requiredId('Choose a subscription'),
  planQuantity: wholeNumber(1, 'Enter at least 1'),
  lines: z.array(lineSchema),
})

export const subscriptionActionSchema = z.object({
  id: requiredId('Choose a subscription'),
  action: z.enum(SUBSCRIPTION_ACTIONS),
})

export const subscriptionListSchema = listSearchSchema.extend({
  status: z.enum(SUBSCRIPTION_STATUSES).optional().catch(undefined),
  planId: z.uuid().optional().catch(undefined),
  customerId: z.uuid().optional().catch(undefined),
})
