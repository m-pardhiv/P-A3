import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { Facts, InvoiceLines, InvoiceTotals, PaymentsTable } from '~/components/invoice-parts'
import { PageHeader } from '~/components/page-header'
import { RecordPaymentForm } from '~/components/record-payment-form'
import { StatusBadge } from '~/components/status-badge'
import { useToast } from '~/components/toast'
import { formatDate, formatDateTime, formatMoney } from '~/lib/format'
import {
  getInvoiceFn,
  runInvoiceAction,
  sendInvoiceFn,
  sendReminderFn,
} from '~/server/functions/invoices'

const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ['invoice', id],
    queryFn: () => getInvoiceFn({ data: { id } }),
  })

export const Route = createFileRoute('/_app/invoices/$id')({
  loader: ({ context, params }) => context.queryClient.query(invoiceQuery(params.id)),
  component: InvoicePage,
})

function InvoicePage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(invoiceQuery(id))
  const { invoice, lines, payments } = data
  const queryClient = useQueryClient()
  const toast = useToast()
  const [cancelling, setCancelling] = useState(false)

  const act = useMutation({
    mutationFn: (action: 'confirm' | 'cancel') => runInvoiceAction({ data: { id, action } }),
    onSuccess: async (result, action) => {
      setCancelling(false)
      if (!result.ok) return toast(result.error ?? 'That did not work', 'danger')
      await queryClient.invalidateQueries()
      toast(action === 'confirm' ? 'Invoice confirmed' : 'Invoice cancelled')
    },
    onError: () => toast('That did not work. Try again.', 'danger'),
  })

  const send = useMutation({
    mutationFn: () => sendInvoiceFn({ data: { id } }),
    onSuccess: async (result) => {
      if (!result.ok) return toast(result.error ?? 'That did not work', 'danger')
      await queryClient.invalidateQueries()
      toast(`Invoice sent to ${result.data.to}`)
    },
    onError: () => toast('That did not work. Try again.', 'danger'),
  })

  const remind = useMutation({
    mutationFn: () => sendReminderFn({ data: { id } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries()
      if (!result.ok) return toast(result.error ?? 'That did not work', 'danger')
      toast(`Reminder sent to ${result.data.to}`)
    },
    onError: () => toast('That did not work. Try again.', 'danger'),
  })

  const amountDue = invoice.status === 'cancelled' ? 0 : invoice.total - invoice.amountPaid
  const busy = act.isPending || send.isPending || remind.isPending

  return (
    <>
      <PageHeader
        title={invoice.number}
        breadcrumbs={[{ label: 'Invoices', to: '/invoices' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {data.actions.includes('confirm') ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => act.mutate('confirm')}
              >
                Confirm
              </button>
            ) : null}
            {data.canSend ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => send.mutate()}
              >
                {invoice.sentAt ? 'Send again' : 'Send to customer'}
              </button>
            ) : null}
            {data.canRemind ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => remind.mutate()}
              >
                Send reminder
              </button>
            ) : null}
            <Link
              to="/print/invoice/$id"
              params={{ id }}
              target="_blank"
              className="btn btn-secondary"
            >
              <Printer size={18} aria-hidden />
              Print
            </Link>
            {data.actions.includes('cancel') ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setCancelling(true)}
              >
                Cancel invoice
              </button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <section aria-label="Details" className="panel flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={invoice.overdue ? 'overdue' : invoice.status} />
            {invoice.overdue ? (
              <p className="text-danger">
                {formatMoney(amountDue)} was due on {formatDate(invoice.dueDate)}.
              </p>
            ) : null}
          </div>
          <Facts
            items={[
              [
                'Customer',
                <Link
                  key="c"
                  to="/customers/$id"
                  params={{ id: invoice.customerId }}
                  className="link"
                >
                  {invoice.customerName}
                </Link>,
              ],
              [
                'Subscription',
                <Link
                  key="s"
                  to="/subscriptions/$id"
                  params={{ id: invoice.subscriptionId }}
                  className="link"
                >
                  {invoice.subscriptionNumber}
                </Link>,
              ],
              [
                'Billing period',
                `${formatDate(invoice.periodStart)} to ${formatDate(invoice.periodEnd)}`,
              ],
              ['Issued', formatDate(invoice.issueDate)],
              ['Due', formatDate(invoice.dueDate)],
              ['Last sent', invoice.sentAt ? formatDateTime(invoice.sentAt) : 'Not sent yet'],
            ]}
          />
        </section>

        <section className="panel">
          <h2 className="mb-4 text-xl font-semibold">Lines</h2>
          <InvoiceLines lines={lines} />
          <InvoiceTotals invoice={invoice} />
        </section>

        <section className="panel">
          <h2 className="mb-4 text-xl font-semibold">Payments</h2>
          <PaymentsTable payments={payments} showNotes />
        </section>

        {data.reminders.length > 0 ? (
          <section className="panel">
            <h2 className="mb-4 text-xl font-semibold">Reminders</h2>
            <ul className="flex flex-col divide-y divide-line">
              {data.reminders.map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                >
                  <span>
                    {reminder.delivered ? 'Sent' : 'Failed'} to {reminder.toEmail}
                    {reminder.sentByName ? ` by ${reminder.sentByName}` : ''}
                    {reminder.error ? ` (${reminder.error})` : ''}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(reminder.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.canPay ? (
          <section className="panel">
            <h2 className="mb-4 text-xl font-semibold">Record a payment</h2>
            <RecordPaymentForm
              key={invoice.amountPaid}
              invoiceId={invoice.id}
              amountDue={amountDue}
              today={data.today}
            />
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={cancelling}
        title={`Cancel ${invoice.number}?`}
        message="A cancelled invoice is no longer owed and cannot be brought back."
        confirmLabel="Cancel invoice"
        onCancel={() => setCancelling(false)}
        onConfirm={() => act.mutate('cancel')}
      />
    </>
  )
}
