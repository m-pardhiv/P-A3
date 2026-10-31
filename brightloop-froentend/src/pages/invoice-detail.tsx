import { motion } from 'framer-motion'
import { ArrowLeft, Download, FileQuestion, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PortalGate } from '@/components/common/portal-gate'
import { CardSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { InvoiceStatusBadge, PaymentStatusBadge } from '@/components/common/status-badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/components/layout/logo'
import { company } from '@/config/company'
import { usePortalData } from '@/context/portal'
import { useInvoiceDownload } from '@/features/invoices/use-invoice-download'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { invoiceSummary, lineTotals } from '@/lib/billing'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types'

function paymentNote(invoice: Invoice, paid: number, outstanding: number) {
  switch (invoice.status) {
    case 'paid':
      return { title: 'Paid in full', body: 'Thank you. No further payment is needed for this invoice.' }
    case 'draft':
      return { title: 'Draft', body: 'This invoice hasn’t been issued yet. Nothing is due.' }
    case 'overdue':
      return { title: 'Payment overdue', body: `${formatCurrency(outstanding, invoice.currency)} was due on ${formatDate(invoice.dueDate)}.` }
    default:
      return paid > 0
        ? { title: 'Partially paid', body: `${formatCurrency(outstanding, invoice.currency)} remains, due ${formatDate(invoice.dueDate)}.` }
        : { title: 'Awaiting payment', body: `${formatCurrency(outstanding, invoice.currency)} is due on ${formatDate(invoice.dueDate)}.` }
  }
}

function InvoiceView({ invoice }: { invoice: Invoice }) {
  const { customer, payments, subscriptions } = usePortalData()
  const { download, busyId } = useInvoiceDownload()
  const s = invoiceSummary(invoice)
  const money = (n: number) => formatCurrency(n, invoice.currency)
  const sub = subscriptions.find((x) => x.id === invoice.subscriptionId)
  const applied = payments.filter((p) => p.invoiceId === invoice.id)
  const note = paymentNote(invoice, s.paid, s.outstanding)
  const hasDiscount = s.discount > 0
  const a = customer.billingAddress
  const paidShare = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={staggerItem} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All invoices
        </Link>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Print invoice
          </Button>
          <Button loading={busyId === invoice.id} onClick={() => download(invoice)}>
            {busyId !== invoice.id && <Download />} Download invoice PDF
          </Button>
        </div>
      </motion.div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] print:block">
        <motion.div variants={staggerItem} className="min-w-0">
          <Card className="print-sheet overflow-hidden">
            <div className="mesh-hero px-5 py-7 sm:px-9 sm:py-9 print:bg-none">
              <div className="flex flex-col justify-between gap-6 sm:flex-row">
                <div>
                  <Logo />
                  <address className="mt-4 text-[13px] not-italic leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{company.name}</span>
                    <br />
                    {company.addressLines.map((l) => (
                      <span key={l}>
                        {l}
                        <br />
                      </span>
                    ))}
                    {company.email}
                  </address>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Invoice</p>
                  <p className="tabular mt-1 text-3xl font-extrabold tracking-tight">{invoice.number}</p>
                  <InvoiceStatusBadge status={invoice.status} className="mt-3" />
                </div>
              </div>
            </div>

            <div className="space-y-8 px-5 py-7 sm:px-9">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice date</dt>
                  <dd className="mt-1 text-sm font-semibold">{formatDate(invoice.issueDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</dt>
                  <dd className={cn('mt-1 text-sm font-semibold', invoice.status === 'overdue' && 'text-danger')}>
                    {formatDate(invoice.dueDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subscription</dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {sub ? (
                      <Link to={`/subscriptions/${sub.id}`} className="tabular hover:text-brand-ink hover:underline print:no-underline">
                        {sub.id}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment status</dt>
                  <dd className="mt-1 text-sm font-semibold">{note.title}</dd>
                </div>
              </dl>

              <div className="grid gap-6 border-y border-border/70 py-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billed to</p>
                  <address className="mt-2 text-sm not-italic leading-relaxed">
                    <span className="font-bold">{customer.companyName}</span>
                    <br />
                    {customer.fullName}
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}
                    <br />
                    {a.city}, {a.state} {a.postalCode}
                    <br />
                    {a.country}
                  </address>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact & tax</p>
                  <p className="mt-2 text-sm leading-relaxed">
                    {customer.billingEmail}
                    <br />
                    {customer.taxId ? (
                      <>
                        <span className="text-muted-foreground">{customer.taxIdType}:</span> {customer.taxId}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="thin-scroll relative -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="pb-3 pr-3">Description</th>
                      <th className="pb-3 pr-3 text-right">Qty</th>
                      <th className="pb-3 pr-3 text-right">Unit price</th>
                      {hasDiscount && <th className="pb-3 pr-3 text-right">Discount</th>}
                      <th className="pb-3 pr-3 text-right">Tax</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item) => {
                      const t = lineTotals(item)
                      return (
                        <tr key={item.id} className="border-b border-border/60 align-top">
                          <td className="py-4 pr-3">
                            <p className="font-semibold">{item.description}</p>
                            {item.detail && <p className="mt-0.5 text-[13px] text-muted-foreground">{item.detail}</p>}
                          </td>
                          <td className="tabular py-4 pr-3 text-right">{item.quantity}</td>
                          <td className="tabular py-4 pr-3 text-right">{money(item.unitPrice)}</td>
                          {hasDiscount && (
                            <td className="tabular py-4 pr-3 text-right text-success">
                              {t.discount > 0 ? `−${money(t.discount)}` : '—'}
                            </td>
                          )}
                          <td className="tabular py-4 pr-3 text-right text-muted-foreground">{formatPercent(item.taxRate)}</td>
                          <td className="tabular py-4 text-right font-semibold">{money(t.net)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <dl className="w-full space-y-2.5 text-sm sm:w-80">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular font-semibold">{money(s.subtotal)}</dd>
                  </div>
                  {hasDiscount && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Discount{invoice.lineItems[0]?.discountLabel ? ` · ${invoice.lineItems[0].discountLabel}` : ''}
                      </dt>
                      <dd className="tabular font-semibold text-success">−{money(s.discount)}</dd>
                    </div>
                  )}
                  {s.taxLines.map((t) => (
                    <div key={t.rate} className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Tax ({formatPercent(t.rate)} on {money(t.base)})
                      </dt>
                      <dd className="tabular font-semibold">{money(t.amount)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold">
                    <dt>Grand total</dt>
                    <dd className="tabular">{money(s.total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="tabular font-semibold">−{money(s.paid)}</dd>
                  </div>
                  <div className="-mx-3 flex justify-between rounded-xl bg-accent px-3 py-3 text-base font-extrabold text-accent-foreground print:bg-transparent">
                    <dt>Amount due</dt>
                    <dd className="tabular">{money(s.outstanding)}</dd>
                  </div>
                </dl>
              </div>

              <p className="rounded-2xl bg-muted/70 px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground print:bg-transparent print:px-0">
                <span className="font-semibold text-foreground">{note.title}.</span> {note.body} Questions? Email{' '}
                {company.supportEmail}.
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem} className="min-w-0 space-y-6 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Payment status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <p className="tabular text-2xl font-extrabold tracking-tight">{money(s.outstanding)}</p>
                <span className="text-[13px] text-muted-foreground">outstanding</span>
              </div>
              <Progress value={paidShare} label="Share of the invoice paid" className="mt-3" />
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="tabular font-semibold">{money(s.total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="tabular font-semibold">{money(s.paid)}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl bg-muted/70 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{note.title}.</span> {note.body}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments on this invoice</CardTitle>
            </CardHeader>
            <CardContent>
              {applied.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {applied.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="tabular truncate text-[13px] font-semibold">{p.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.date)} · {p.methodLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular text-sm font-semibold">{money(p.amount)}</p>
                        <PaymentStatusBadge status={p.status} className="mt-1 px-2 py-0.5 text-[11px]" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

function InvoiceRoute() {
  const { id } = useParams()
  const { invoices } = usePortalData()
  const invoice = invoices.find((i) => i.id === id)
  useDocumentTitle(invoice ? invoice.number : 'Invoice')

  if (!invoice) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="We couldn’t find that invoice"
          description="It may not belong to your account, or the link may be out of date."
          action={<LinkButton to="/invoices">View all invoices</LinkButton>}
        />
      </Card>
    )
  }
  return <InvoiceView invoice={invoice} />
}

export default function InvoiceDetailPage() {
  return (
    <PortalGate
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <CardSkeleton className="h-[40rem]" />
            <CardSkeleton />
          </div>
        </div>
      }
    >
      <InvoiceRoute />
    </PortalGate>
  )
}
