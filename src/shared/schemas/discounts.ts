import { z } from 'zod'
import {
  checkbox,
  dateSchema,
  MONEY_PATTERN,
  moneySchema,
  optionalId,
  requiredText,
  rupeesToPaise,
  wholeNumber,
} from './fields'
import { paginationSchema } from './pagination'

export const DISCOUNT_KINDS = ['percent', 'fixed'] as const
export const DISCOUNT_SCOPES = ['product', 'subscription'] as const

export const discountSchema = z
  .object({
    id: optionalId,
    name: requiredText('Enter a discount name'),
    kind: z.enum(DISCOUNT_KINDS, 'Choose percentage or fixed amount'),
    // A percentage for one kind and rupees for the other, so it is read after the kind is known.
    value: z.string().trim().min(1, 'Enter the discount value'),
    minPurchaseAmount: z
      .union([z.literal(''), moneySchema])
      .transform((amount) => (amount === '' ? 0 : amount)),
    minQuantity: wholeNumber(1, 'Enter a quantity of at least 1'),
    startDate: dateSchema,
    endDate: dateSchema,
    usageLimit: wholeNumber(1, 'Enter a limit of at least 1'),
    scope: z.enum(DISCOUNT_SCOPES, 'Choose what the discount applies to'),
    productId: optionalId,
    active: checkbox,
  })
  .superRefine((discount, ctx) => {
    const problem = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })

    if (discount.kind === 'percent') {
      const percent = Number(discount.value)
      if (!/^\d{1,3}$/.test(discount.value) || percent < 1 || percent > 100) {
        problem('value', 'Enter a whole percentage from 1 to 100')
      }
    } else if (!MONEY_PATTERN.test(discount.value) || rupeesToPaise(discount.value) <= 0) {
      problem('value', 'Enter an amount above 0, such as 100 or 99.50')
    }
    if (discount.endDate < discount.startDate) {
      problem('endDate', 'The end date cannot be before the start date')
    }
    if (discount.scope === 'product' && !discount.productId) {
      problem('productId', 'Choose the product this discount is for')
    }
  })
  .transform((discount) => ({
    ...discount,
    value: discount.kind === 'percent' ? Number(discount.value) : rupeesToPaise(discount.value),
    // A discount on the whole subscription has no product.
    productId: discount.scope === 'product' ? discount.productId : null,
  }))

export const discountListSchema = paginationSchema
