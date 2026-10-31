import { Plus, Trash2 } from 'lucide-react'
import { formatMoney } from '~/lib/format'
import { taxOn } from '~/server/domain/tax'
import type { FieldErrors } from '~/shared/result'

export type LineProduct = {
  id: string
  name: string
  salesPrice: number
  taxRatePercent: number
  variants: { id: string; label: string; extraPrice: number }[]
}

export type LineDraft = {
  key: string
  id?: string
  productId: string
  variantId: string
  quantity: string
  /** Set on saved lines, which keep the price and tax copied when they were added. */
  unitPrice?: number
  taxRatePercent?: number
}

export const newLine = (): LineDraft => ({
  key: crypto.randomUUID(),
  productId: '',
  variantId: '',
  quantity: '1',
})

/** What a line costs now: its copied price if it has one, otherwise the catalogue price. */
export function linePrice(line: LineDraft, products: LineProduct[]) {
  const product = products.find((p) => p.id === line.productId)
  const variant = product?.variants.find((v) => v.id === line.variantId)
  const catalogue = product ? product.salesPrice + (variant?.extraPrice ?? 0) : 0
  const unitPrice = line.unitPrice ?? catalogue
  const taxRatePercent = line.taxRatePercent ?? product?.taxRatePercent ?? 0
  const amount = unitPrice * (Number(line.quantity) || 0)
  return { unitPrice, taxRatePercent, amount, tax: taxOn(amount, taxRatePercent) }
}

export const linesPayload = (lines: LineDraft[]) =>
  lines.map(({ id, productId, variantId, quantity }) => ({ id, productId, variantId, quantity }))

export function LineEditor(props: {
  lines: LineDraft[]
  products: LineProduct[]
  errors: FieldErrors
  onChange: (lines: LineDraft[]) => void
}) {
  const { lines, products, errors, onChange } = props

  const update = (key: string, patch: Partial<LineDraft>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, index) => {
        const product = products.find((p) => p.id === line.productId)
        const price = linePrice(line, products)
        const productError = errors[`lines.${index}.productId`]
        const variantError = errors[`lines.${index}.variantId`]
        const quantityError = errors[`lines.${index}.quantity`]

        return (
          <div
            key={line.key}
            className="grid grid-cols-[5rem_minmax(0,1fr)_auto] gap-2 border-b border-line pb-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_5rem_7rem_auto] sm:items-start"
          >
            <div className="col-span-3 sm:col-span-1">
              <select
                aria-label={`Product for line ${index + 1}`}
                className="input"
                value={line.productId}
                aria-invalid={productError ? true : undefined}
                onChange={(event) =>
                  // A new product means a new price, so the copied values no longer apply.
                  update(line.key, {
                    productId: event.target.value,
                    variantId: '',
                    id: undefined,
                    unitPrice: undefined,
                    taxRatePercent: undefined,
                  })
                }
              >
                <option value="">Choose a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {productError ? <p className="mt-1 text-sm text-danger">{productError}</p> : null}
            </div>
            <div className="col-span-3 sm:col-span-1">
              <select
                aria-label={`Variant for line ${index + 1}`}
                className="input"
                value={line.variantId}
                disabled={!product?.variants.length}
                aria-invalid={variantError ? true : undefined}
                onChange={(event) =>
                  update(line.key, {
                    variantId: event.target.value,
                    id: undefined,
                    unitPrice: undefined,
                    taxRatePercent: undefined,
                  })
                }
              >
                <option value="">No variant</option>
                {product?.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.label} (+{formatMoney(variant.extraPrice)})
                  </option>
                ))}
              </select>
              {variantError ? <p className="mt-1 text-sm text-danger">{variantError}</p> : null}
            </div>
            <div>
              <input
                aria-label={`Quantity for line ${index + 1}`}
                className="input tabular"
                inputMode="numeric"
                value={line.quantity}
                aria-invalid={quantityError ? true : undefined}
                onChange={(event) => update(line.key, { quantity: event.target.value })}
              />
              {quantityError ? <p className="mt-1 text-sm text-danger">{quantityError}</p> : null}
            </div>
            <p className="tabular self-center text-right">{formatMoney(price.amount)}</p>
            <button
              type="button"
              aria-label={`Remove line ${index + 1}`}
              className="btn btn-secondary px-3"
              onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        )
      })}
      <div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange([...lines, newLine()])}
        >
          <Plus size={16} aria-hidden />
          Add product line
        </button>
      </div>
    </div>
  )
}
