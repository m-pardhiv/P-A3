import { z } from 'zod'
import {
  checkbox,
  moneySchema,
  optionalDate,
  optionalId,
  optionalText,
  requiredId,
  requiredText,
  wholeNumber,
} from './fields'

export const PRODUCT_TYPES = ['software', 'service', 'training', 'hardware'] as const
export const BILLING_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const

export const productSchema = z.object({
  id: optionalId,
  name: requiredText('Enter a product name'),
  type: z.enum(PRODUCT_TYPES, 'Choose a product type'),
  salesPrice: moneySchema,
  costPrice: moneySchema,
  notes: optionalText,
  active: checkbox,
})

export const variantSchema = z.object({
  productId: requiredId('Choose a product'),
  attribute: requiredText('Enter an attribute, such as Brand'),
  value: requiredText('Enter a value, such as Odoo'),
  extraPrice: moneySchema,
})

export const taxRuleSchema = z
  .object({
    id: optionalId,
    name: requiredText('Enter a rule name'),
    ratePercent: z
      .union([z.string(), z.number()])
      .transform(Number)
      .pipe(z.number('Enter a rate').min(0, 'Enter 0 to 100').max(100, 'Enter 0 to 100')),
    productType: z
      .union([z.literal(''), z.enum(PRODUCT_TYPES)])
      .nullish()
      .transform((value) => value || null),
    productId: optionalId,
    isDefault: checkbox,
    active: checkbox,
  })
  .superRefine((rule, ctx) => {
    if (rule.productType && rule.productId) {
      ctx.addIssue({
        code: 'custom',
        path: ['productId'],
        message: 'Choose a product or a product type, not both',
      })
    }
    if (rule.isDefault && (rule.productType || rule.productId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['isDefault'],
        message: 'The default rule cannot target a product or type',
      })
    }
    if (!rule.isDefault && !rule.productType && !rule.productId) {
      ctx.addIssue({
        code: 'custom',
        path: ['productId'],
        message: 'Choose a product or type, or make this the default',
      })
    }
  })

export const paymentTermSchema = z.object({
  id: optionalId,
  name: requiredText('Enter a name'),
  daysDue: wholeNumber(0, 'Enter 0 or more days'),
})

export const planSchema = z
  .object({
    id: optionalId,
    name: requiredText('Enter a plan name'),
    price: moneySchema,
    billingPeriod: z.enum(BILLING_PERIODS, 'Choose a billing period'),
    minQuantity: wholeNumber(1, 'Enter a quantity of at least 1'),
    availableFrom: optionalDate,
    availableTo: optionalDate,
    autoClose: checkbox,
    closable: checkbox,
    pausable: checkbox,
    renewable: checkbox,
    active: checkbox,
  })
  .refine(
    (plan) => !plan.availableFrom || !plan.availableTo || plan.availableTo >= plan.availableFrom,
    { path: ['availableTo'], message: 'The end date cannot be before the start date' },
  )

export const customerSchema = z.object({
  id: optionalId,
  name: requiredText('Enter a customer name'),
  company: optionalText,
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  phone: optionalText,
  address: optionalText,
})
