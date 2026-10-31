import { addDays, addMonths, addYears, daysBetween, monthsBetween } from './dates'
import { type DiscountRule, selectDiscounts } from './discounts'
import { taxOn } from './tax'

export type BillingPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** A runaway catch-up (a daily plan left for years) finishes over several runs instead. */
export const MAX_PERIODS_PER_RUN = 400

/**
 * Start of billing period k. It is always counted from the start-date anchor, never from the
 * previous period: adding a month to 28 Feb would give 28 Mar, but 31 Jan + 2 months is 31 Mar.
 */
export function periodStart(anchor: string, period: BillingPeriod, k: number) {
  switch (period) {
    case 'daily':
      return addDays(anchor, k)
    case 'weekly':
      return addDays(anchor, 7 * k)
    case 'monthly':
      return addMonths(anchor, k)
    case 'yearly':
      return addYears(anchor, k)
  }
}

/** The first period index whose start is on or after `date`. */
export function periodIndexAtOrAfter(anchor: string, period: BillingPeriod, date: string) {
  if (date <= anchor) return 0
  const estimate =
    period === 'daily'
      ? daysBetween(anchor, date)
      : period === 'weekly'
        ? Math.floor(daysBetween(anchor, date) / 7)
        : period === 'monthly'
          ? monthsBetween(anchor, date)
          : Math.floor(monthsBetween(anchor, date) / 12)

  // The estimate can be off by one around month ends, so settle it exactly.
  let k = Math.max(0, estimate - 1)
  while (periodStart(anchor, period, k) < date) k++
  return k
}

export type DuePeriod = { index: number; start: string; end: string }

/**
 * Every period that should have been invoiced by `asOf`, starting from `nextInvoiceDate`.
 * `nextStart` is where billing resumes, or null when the expiry date ends billing.
 */
export function duePeriods(input: {
  startDate: string
  expiryDate: string | null
  nextInvoiceDate: string
  billingPeriod: BillingPeriod
  asOf: string
}) {
  const { startDate, expiryDate, nextInvoiceDate, billingPeriod, asOf } = input
  const periods: DuePeriod[] = []
  let k = periodIndexAtOrAfter(startDate, billingPeriod, nextInvoiceDate)

  while (periods.length < MAX_PERIODS_PER_RUN) {
    const start = periodStart(startDate, billingPeriod, k)
    if (expiryDate && start > expiryDate) return { periods, nextStart: null }
    if (start > asOf) return { periods, nextStart: start }

    const naturalEnd = addDays(periodStart(startDate, billingPeriod, k + 1), -1)
    periods.push({
      index: k,
      start,
      end: expiryDate && expiryDate < naturalEnd ? expiryDate : naturalEnd,
    })
    k++
  }

  const resume = periodStart(startDate, billingPeriod, k)
  return { periods, nextStart: expiryDate && resume > expiryDate ? null : resume }
}

export type SourceLine = {
  description: string
  productId: string | null
  quantity: number
  unitPrice: number
  taxRatePercent: number
}

export type InvoiceLineDraft = SourceLine & {
  taxAmount: number
  amount: number
  /** Set on discount lines, so billing can count a redemption. */
  discountId?: string
}

/** Tax-exclusive lines, tax per line rounded half-up, discount lines negative. */
export function buildInvoice(input: {
  lines: SourceLine[]
  discounts: DiscountRule[]
  issueDate: string
  paymentTermDays: number
}) {
  const priced = input.lines.map((line) => ({
    ...line,
    amount: line.unitPrice * line.quantity,
    taxAmount: taxOn(line.unitPrice * line.quantity, line.taxRatePercent),
  }))

  const applied = selectDiscounts(
    priced.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      amount: line.amount,
      taxRatePercent: line.taxRatePercent,
    })),
    input.discounts,
    input.issueDate,
  )

  const discountLines: InvoiceLineDraft[] = applied.map((discount) => ({
    description: `Discount: ${discount.name}`,
    productId: null,
    quantity: 1,
    unitPrice: -discount.amount,
    taxRatePercent: discount.taxRatePercent,
    taxAmount: -discount.taxAmount,
    amount: -discount.amount,
    discountId: discount.id,
  }))

  const lines: InvoiceLineDraft[] = [...priced, ...discountLines]
  const subtotal = priced.reduce((sum, line) => sum + line.amount, 0)
  const discountTotal = discountLines.reduce((sum, line) => sum - line.amount, 0)
  const taxTotal = lines.reduce((sum, line) => sum + line.taxAmount, 0)

  return {
    lines,
    subtotal,
    discountTotal,
    taxTotal,
    total: subtotal - discountTotal + taxTotal,
    issueDate: input.issueDate,
    dueDate: addDays(input.issueDate, input.paymentTermDays),
  }
}
