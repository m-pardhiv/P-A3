import { addDays, daysBetween } from './dates'
import { resolveTaxRate, type TaxRule, taxOn } from './tax'

type Product = { id: string; name: string; type: string; salesPrice: number; active: boolean }
type Variant = {
  id: string
  productId: string
  attribute: string
  value: string
  extraPrice: number
}
type Plan = {
  name: string
  price: number
  minQuantity: number
  availableFrom: string | null
  availableTo: string | null
  active: boolean
}

export type Catalogue = {
  products: Map<string, Product>
  variants: Map<string, Variant>
  taxRules: TaxRule[]
}

export type PricedLine = {
  productId: string | null
  variantId: string | null
  description: string
  quantity: number
  unitPrice: number
  taxRatePercent: number
  amount: number
}

export type LineInput = {
  id?: string | null
  productId: string
  variantId: string | null
  quantity: number
}

type ExistingLine = PricedLine & { id: string }
type FieldError = { field: string; message: string }

export function planLine(plan: Plan, quantity: number, taxRules: TaxRule[]): PricedLine {
  return {
    productId: null,
    variantId: null,
    description: plan.name,
    quantity,
    unitPrice: plan.price,
    taxRatePercent: resolveTaxRate(null, taxRules),
    amount: plan.price * quantity,
  }
}

/** A line's unit price is copied here, so later catalogue changes never rewrite it. */
export function productLine(input: LineInput, catalogue: Catalogue): PricedLine {
  const product = catalogue.products.get(input.productId) as Product
  const variant = input.variantId ? catalogue.variants.get(input.variantId) : undefined
  const unitPrice = product.salesPrice + (variant?.extraPrice ?? 0)
  return {
    productId: product.id,
    variantId: variant?.id ?? null,
    description: variant ? `${product.name} (${variant.value})` : product.name,
    quantity: input.quantity,
    unitPrice,
    taxRatePercent: resolveTaxRate(product, catalogue.taxRules),
    amount: unitPrice * input.quantity,
  }
}

export function lineError(lines: LineInput[], catalogue: Catalogue): FieldError | null {
  for (const [index, line] of lines.entries()) {
    const product = catalogue.products.get(line.productId)
    if (!product?.active) {
      return { field: `lines.${index}.productId`, message: 'This product is not available' }
    }
    const variant = line.variantId ? catalogue.variants.get(line.variantId) : undefined
    if (line.variantId && variant?.productId !== line.productId) {
      return { field: `lines.${index}.variantId`, message: 'This variant is not on that product' }
    }
  }
  return null
}

export function planError(
  plan: Plan,
  input: { startDate: string; planQuantity: number },
): FieldError | null {
  if (!plan.active) return { field: 'planId', message: 'This plan is not active' }
  if (plan.availableFrom && input.startDate < plan.availableFrom) {
    return { field: 'startDate', message: `This plan starts on ${plan.availableFrom}` }
  }
  if (plan.availableTo && input.startDate > plan.availableTo) {
    return { field: 'startDate', message: `This plan ended on ${plan.availableTo}` }
  }
  if (input.planQuantity < plan.minQuantity) {
    return {
      field: 'planQuantity',
      message: `This plan needs a quantity of at least ${plan.minQuantity}`,
    }
  }
  return null
}

/** Lines that keep their product and variant keep their copied price and tax rate. */
export function mergeLines(
  existing: ExistingLine[],
  planQuantity: number,
  inputs: LineInput[],
  catalogue: Catalogue,
): PricedLine[] {
  const base = existing.find((line) => line.productId === null) as ExistingLine
  const lines = inputs.map((input) => {
    const kept = existing.find(
      (line) =>
        line.id === input.id &&
        line.productId === input.productId &&
        line.variantId === input.variantId,
    )
    if (!kept) return productLine(input, catalogue)
    return { ...kept, quantity: input.quantity, amount: kept.unitPrice * input.quantity }
  })
  return [{ ...base, quantity: planQuantity, amount: base.unitPrice * planQuantity }, ...lines]
}

export function totals(lines: Pick<PricedLine, 'amount' | 'taxRatePercent'>[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const tax = lines.reduce((sum, line) => sum + taxOn(line.amount, line.taxRatePercent), 0)
  return { subtotal, tax, total: subtotal + tax }
}

/** The renewal starts the day after expiry and runs for the same number of days. */
export function renewalDates(subscription: { startDate: string; expiryDate: string }) {
  const startDate = addDays(subscription.expiryDate, 1)
  const length = daysBetween(subscription.startDate, subscription.expiryDate)
  return { startDate, expiryDate: addDays(startDate, length) }
}
