import type { Invoice, InvoiceLineItem, Subscription } from '@/types'
import { daysBetween, parseDate, startOfToday } from './format'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface LineTotals {
  gross: number
  discount: number
  net: number
  tax: number
  total: number
}

export function lineTotals(item: Pick<InvoiceLineItem, 'quantity' | 'unitPrice' | 'taxRate' | 'discountPercent'>): LineTotals {
  const gross = round2(item.quantity * item.unitPrice)
  const discount = round2(gross * item.discountPercent)
  const net = round2(gross - discount)
  const tax = round2(net * item.taxRate)
  return { gross, discount, net, tax, total: round2(net + tax) }
}

export interface TaxLine {
  rate: number
  base: number
  amount: number
}

export interface DocumentTotals {
  subtotal: number
  discount: number
  taxable: number
  tax: number
  taxLines: TaxLine[]
  total: number
}

export function documentTotals(items: InvoiceLineItem[]): DocumentTotals {
  const byRate = new Map<number, TaxLine>()
  let subtotal = 0
  let discount = 0
  let tax = 0
  for (const item of items) {
    const t = lineTotals(item)
    subtotal += t.gross
    discount += t.discount
    tax += t.tax
    const line = byRate.get(item.taxRate) ?? { rate: item.taxRate, base: 0, amount: 0 }
    line.base = round2(line.base + t.net)
    line.amount = round2(line.amount + t.tax)
    byRate.set(item.taxRate, line)
  }
  const taxable = round2(subtotal - discount)
  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    taxable,
    tax: round2(tax),
    taxLines: [...byRate.values()].filter((l) => l.rate > 0),
    total: round2(taxable + tax),
  }
}

export function invoiceSummary(invoice: Invoice) {
  const totals = documentTotals(invoice.lineItems)
  const paid = Math.min(invoice.paidAmount, totals.total)
  // Draft invoices have not been issued yet, so nothing is owed.
  const outstanding = invoice.status === 'draft' ? 0 : round2(totals.total - paid)
  return { ...totals, paid, outstanding }
}

export function subscriptionPricing(sub: Subscription) {
  const totals = documentTotals([
    {
      id: 'sub',
      description: sub.productName,
      quantity: sub.quantity,
      unitPrice: sub.unitPrice,
      taxRate: sub.taxRate,
      discountPercent: (sub.discount?.percent ?? 0) / 100,
    },
  ])
  return totals
}

/** Share of the subscription term that has elapsed, 0–100, based on start/expiry dates. */
export function termProgress(startIso: string, expiryIso: string, today = startOfToday()) {
  const start = parseDate(startIso)
  const end = parseDate(expiryIso)
  const total = daysBetween(start, end)
  if (total <= 0) return 100
  const elapsed = daysBetween(start, today)
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
}

export function daysRemaining(expiryIso: string, today = startOfToday()) {
  return daysBetween(today, parseDate(expiryIso))
}

export function isOverdue(invoice: Invoice, today = startOfToday()) {
  return invoice.status === 'overdue' || (invoice.status === 'pending' && parseDate(invoice.dueDate) < today)
}
