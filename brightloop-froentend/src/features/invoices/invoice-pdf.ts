import { company } from '@/config/company'
import { documentTotals, invoiceSummary, lineTotals } from '@/lib/billing'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import type { Customer, Invoice } from '@/types'

const INK: [number, number, number] = [20, 17, 15]
const MUTED: [number, number, number] = [107, 101, 92]
const RULE: [number, number, number] = [231, 227, 218]
const ACCENT: [number, number, number] = [200, 68, 106]

/** Builds the PDF client-side. jsPDF is imported lazily so it never weighs on the main bundle. */
export async function downloadInvoicePdf(invoice: Invoice, customer: Customer) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 18
  const right = 192
  const money = (n: number) => formatCurrency(n, invoice.currency)
  const summary = invoiceSummary(invoice)
  const totals = documentTotals(invoice.lineItems)

  // Header
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...ACCENT)
  doc.text(company.brand, left, 24)
  doc.setFontSize(24).setTextColor(...INK)
  doc.text('INVOICE', right, 24, { align: 'right' })

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  const issuer = [company.name, ...company.addressLines, company.email, company.taxId]
  issuer.forEach((line, i) => doc.text(line, left, 33 + i * 4.6))

  // Meta
  const meta: [string, string][] = [
    ['Invoice number', invoice.number],
    ['Invoice date', formatDate(invoice.issueDate)],
    ['Due date', formatDate(invoice.dueDate)],
    ['Status', invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)],
  ]
  meta.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'normal').setTextColor(...MUTED).text(k, 130, 33 + i * 5.6)
    doc.setFont('helvetica', 'bold').setTextColor(...INK).text(v, right, 33 + i * 5.6, { align: 'right' })
  })

  // Bill to
  let y = 70
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...MUTED).text('BILL TO', left, y)
  doc.setFontSize(10).setTextColor(...INK).text(customer.companyName, left, y + 6)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED)
  const a = customer.billingAddress
  const billTo = [
    customer.fullName,
    a.line1 + (a.line2 ? `, ${a.line2}` : ''),
    `${a.city}, ${a.state} ${a.postalCode}`,
    a.country,
    customer.billingEmail,
    customer.taxId ? `${customer.taxIdType} ${customer.taxId}` : '',
  ].filter(Boolean)
  billTo.forEach((line, i) => doc.text(line, left, y + 11 + i * 4.6))

  // Line items
  y = 112
  doc.setDrawColor(...RULE).setLineWidth(0.3)
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...MUTED)
  doc.text('DESCRIPTION', left, y)
  doc.text('QTY', 112, y, { align: 'right' })
  doc.text('UNIT PRICE', 142, y, { align: 'right' })
  doc.text('TAX', 160, y, { align: 'right' })
  doc.text('AMOUNT', right, y, { align: 'right' })
  doc.line(left, y + 3, right, y + 3)

  y += 10
  for (const item of invoice.lineItems) {
    const t = lineTotals(item)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK).text(item.description, left, y, { maxWidth: 80 })
    if (item.detail) doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED).text(item.detail, left, y + 4.8)
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK)
    doc.text(String(item.quantity), 112, y, { align: 'right' })
    doc.text(money(item.unitPrice), 142, y, { align: 'right' })
    doc.text(formatPercent(item.taxRate), 160, y, { align: 'right' })
    doc.text(money(t.gross), right, y, { align: 'right' })
    if (t.discount > 0) {
      doc.setFontSize(8.5).setTextColor(...MUTED)
      doc.text(`${item.discountLabel ?? 'Discount'} (${formatPercent(item.discountPercent)})`, left, y + 9.4)
      doc.text(`-${money(t.discount)}`, right, y + 9.4, { align: 'right' })
      y += 5
    }
    y += 11
    doc.line(left, y - 4, right, y - 4)
  }

  // Totals
  y += 4
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 11 : 9.5)
    doc.setTextColor(...(bold ? INK : MUTED)).text(label, 130, y)
    doc.setTextColor(...INK).text(value, right, y, { align: 'right' })
    y += bold ? 8 : 6
  }
  row('Subtotal', money(totals.subtotal))
  if (totals.discount > 0) row('Discount', `-${money(totals.discount)}`)
  totals.taxLines.forEach((t) => row(`Tax (${formatPercent(t.rate)})`, money(t.amount)))
  doc.line(130, y - 3, right, y - 3)
  y += 2
  row('Total', money(totals.total), true)
  row('Amount paid', money(summary.paid))
  doc.setTextColor(...ACCENT)
  row('Amount due', money(summary.outstanding), true)

  // Footer
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
  doc.text(`Questions about this invoice? Contact ${company.supportEmail}`, left, 280)
  doc.text('Preview document generated from sample data', right, 280, { align: 'right' })

  doc.save(`${invoice.number}.pdf`)
}
