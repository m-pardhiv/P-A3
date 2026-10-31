import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { humanize, paiseToInput } from '~/lib/format'
import { recordPaymentFn } from '~/server/functions/invoices'
import { PAYMENT_METHODS, recordPaymentSchema } from '~/shared/schemas/invoices'
import { FormError, FormField, SelectField } from './form-field'
import { useToast } from './toast'
import { useZodForm } from './use-zod-form'

export function RecordPaymentForm(props: { invoiceId: string; amountDue: number; today: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  // Made in the browser after load, so it differs per form and never mismatches server output.
  const [idempotencyKey, setIdempotencyKey] = useState('')
  useEffect(() => setIdempotencyKey(crypto.randomUUID()), [])

  const form = useZodForm({
    schema: recordPaymentSchema,
    values: () => ({ idempotencyKey }),
    submit: (input) => recordPaymentFn({ data: input }),
    onSuccess: async ({ status }) => {
      await queryClient.invalidateQueries()
      toast(status === 'paid' ? 'Payment recorded. The invoice is paid.' : 'Payment recorded')
    },
  })

  return (
    <form onSubmit={form.onSubmit} method="post" noValidate className="flex flex-col gap-4">
      <FormError message={form.formError} />
      <input type="hidden" name="invoiceId" value={props.invoiceId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Method"
          required
          name="method"
          defaultValue=""
          placeholder="Choose a method"
          options={PAYMENT_METHODS.map((method) => ({ value: method, label: humanize(method) }))}
          error={form.fieldErrors.method}
        />
        <FormField
          label="Amount (₹)"
          required
          name="amount"
          inputMode="decimal"
          defaultValue={paiseToInput(props.amountDue)}
          hint="Pay part of it, or all of it."
          error={form.fieldErrors.amount}
        />
        <FormField
          label="Paid on"
          required
          name="paidOn"
          type="date"
          max={props.today}
          defaultValue={props.today}
          error={form.fieldErrors.paidOn}
        />
        <FormField label="Note" name="note" error={form.fieldErrors.note} />
      </div>
      <div>
        <button type="submit" className="btn btn-primary" disabled={form.pending}>
          {form.pending ? 'Recording payment' : 'Record payment'}
        </button>
      </div>
    </form>
  )
}
