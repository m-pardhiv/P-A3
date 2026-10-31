import { taxOn } from './tax'

export type DiscountRule = {
  id: string
  name: string
  kind: 'percent' | 'fixed'
  /** Whole percent for percent discounts, paise for fixed ones. */
  value: number
  minPurchaseAmount: number
  minQuantity: number
  startDate: string
  endDate: string
  usageLimit: number
  usedCount: number
  scope: 'product' | 'subscription'
  productId: string | null
  active: boolean
}

type PricedLine = {
  productId: string | null
  quantity: number
  amount: number
  taxRatePercent: number
}

export type AppliedDiscount = {
  id: string
  name: string
  scope: 'product' | 'subscription'
  amount: number
  /** Tax removed by this discount, so the invoice charges tax on the discounted price. */
  taxAmount: number
  /** For display only: the discount's tax as a share of its amount. */
  taxRatePercent: number
}

/** Whether the rule can be used on an invoice issued on `date`, ignoring what is on the invoice. */
export function isUsable(rule: DiscountRule, date: string) {
  return (
    rule.active &&
    rule.startDate <= date &&
    date <= rule.endDate &&
    rule.usedCount < rule.usageLimit
  )
}

/** Why a rule is or is not in play today, for the admin list. A discount ends by itself. */
export function discountState(rule: DiscountRule, today: string) {
  if (!rule.active) return 'inactive' as const
  if (rule.usedCount >= rule.usageLimit) return 'used up' as const
  if (today > rule.endDate) return 'expired' as const
  if (today < rule.startDate) return 'scheduled' as const
  return 'active' as const
}

export function saving(rule: DiscountRule, amount: number) {
  const raw = rule.kind === 'percent' ? Math.floor((amount * rule.value + 50) / 100) : rule.value
  return Math.min(Math.max(raw, 0), amount)
}

const largest = (candidates: { rule: DiscountRule; amount: number }[]) =>
  candidates.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)[0]

/**
 * At most one discount per product line and one per subscription, each the largest saving.
 * A rule is used once per invoice. The subscription discount applies to what is left after the
 * product discounts, so the two can never take more than the invoice is worth.
 */
export function selectDiscounts(
  lines: PricedLine[],
  rules: DiscountRule[],
  issueDate: string,
): AppliedDiscount[] {
  const usable = rules.filter((rule) => isUsable(rule, issueDate))
  const applied: AppliedDiscount[] = []
  const used = new Set<string>()
  const remaining = lines.map((line) => line.amount)

  lines.forEach((line, index) => {
    if (!line.productId) return
    const candidates = usable
      .filter(
        (rule) =>
          rule.scope === 'product' &&
          rule.productId === line.productId &&
          !used.has(rule.id) &&
          line.quantity >= rule.minQuantity &&
          line.amount >= rule.minPurchaseAmount,
      )
      .map((rule) => ({ rule, amount: saving(rule, line.amount) }))
    const best = largest(candidates)
    if (!best) return

    used.add(best.rule.id)
    remaining[index] -= best.amount
    const taxAmount = taxOn(best.amount, line.taxRatePercent)
    applied.push({
      id: best.rule.id,
      name: best.rule.name,
      scope: 'product',
      amount: best.amount,
      taxAmount,
      taxRatePercent: line.taxRatePercent,
    })
  })

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  const base = remaining.reduce((sum, amount) => sum + amount, 0)
  const best = largest(
    usable
      .filter(
        (rule) =>
          rule.scope === 'subscription' &&
          !used.has(rule.id) &&
          subtotal >= rule.minPurchaseAmount &&
          quantity >= rule.minQuantity,
      )
      .map((rule) => ({ rule, amount: saving(rule, base) })),
  )
  if (best) {
    // Spread the discount over the lines in proportion, so each line's own tax rate is respected.
    let left = best.amount
    let taxAmount = 0
    remaining.forEach((amount, index) => {
      const share =
        index === remaining.length - 1 ? left : Math.floor((best.amount * amount) / (base || 1))
      const portion = Math.min(share, left)
      left -= portion
      taxAmount += taxOn(portion, lines[index].taxRatePercent)
    })
    applied.push({
      id: best.rule.id,
      name: best.rule.name,
      scope: 'subscription',
      amount: best.amount,
      taxAmount,
      taxRatePercent: Math.round((taxAmount / best.amount) * 10000) / 100,
    })
  }
  return applied
}
