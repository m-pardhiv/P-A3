export type TaxRule = {
  ratePercent: number
  productType: string | null
  productId: string | null
  isDefault: boolean
  active: boolean
}

/** Specific product first, then product type, then the default. Pass null for a plan's base fee. */
export function resolveTaxRate(product: { id: string; type: string } | null, rules: TaxRule[]) {
  const active = rules.filter((rule) => rule.active)
  const specific =
    product &&
    (active.find((rule) => rule.productId === product.id) ??
      active.find((rule) => rule.productType === product.type))
  return (specific ?? active.find((rule) => rule.isDefault))?.ratePercent ?? 0
}

/** Tax on a tax-exclusive amount, rounded half-up. Integer maths avoids float drift. */
export function taxOn(amount: number, ratePercent: number) {
  const basisPoints = Math.round(ratePercent * 100)
  return Math.floor((amount * basisPoints + 5000) / 10000)
}
