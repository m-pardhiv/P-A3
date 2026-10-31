import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { FormError, FormField } from '~/components/form-field'
import { PageHeader } from '~/components/page-header'
import { useToast } from '~/components/toast'
import { useZodForm } from '~/components/use-zod-form'
import {
  deletePaymentTerm,
  listPaymentTerms,
  savePaymentTerm,
} from '~/server/functions/payment-terms'
import { paymentTermSchema } from '~/shared/schemas/catalogue'
import { paginationSchema } from '~/shared/schemas/pagination'

const termsQuery = (page: number) =>
  queryOptions({
    queryKey: ['payment-terms', page],
    queryFn: () => listPaymentTerms({ data: { page } }),
  })

export const Route = createFileRoute('/_app/_admin/payment-terms')({
  validateSearch: paginationSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.query(termsQuery(deps.page)),
  component: PaymentTermsPage,
})

type Term = Awaited<ReturnType<typeof listPaymentTerms>>['rows'][number]

function TermForm({ term, onDone }: { term?: Term; onDone: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const form = useZodForm({
    schema: paymentTermSchema,
    submit: (input) => savePaymentTerm({ data: input }),
    onSuccess: (_, element) => {
      element.reset()
      queryClient.invalidateQueries()
      toast(term ? 'Payment terms saved' : 'Payment terms created')
      onDone()
    },
  })

  return (
    <section className="panel">
      <h2 className="mb-4 text-xl font-semibold">
        {term ? 'Edit payment terms' : 'New payment terms'}
      </h2>
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={form.formError} />
        <input type="hidden" name="id" value={term?.id ?? ''} />
        <FormField
          label="Name"
          name="name"
          defaultValue={term?.name}
          error={form.fieldErrors.name}
        />
        <FormField
          label="Days until due"
          name="daysDue"
          inputMode="numeric"
          defaultValue={term?.daysDue}
          error={form.fieldErrors.daysDue}
        />
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={form.pending}>
            {form.pending ? 'Saving' : term ? 'Save payment terms' : 'Create payment terms'}
          </button>
          {term ? (
            <button type="button" className="btn btn-secondary" onClick={onDone}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}

function PaymentTermsPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(termsQuery(page))
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<Term>()
  const [removing, setRemoving] = useState<Term>()

  const remove = useMutation({
    mutationFn: (id: string) => deletePaymentTerm({ data: { id } }),
    onSuccess: (result) => {
      setRemoving(undefined)
      if (result.ok) {
        queryClient.invalidateQueries()
        toast('Payment terms deleted')
      } else {
        toast(result.error ?? 'These payment terms could not be deleted', 'danger')
      }
    },
  })

  return (
    <>
      <PageHeader title="Payment Terms" description="How long customers have to pay an invoice." />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <DataTable
          data={data}
          rowKey={(row) => row.id}
          onPageChange={(next) => navigate({ search: { page: next } })}
          empty={
            <EmptyState title="No payment terms yet" message="Create the first payment terms." />
          }
          columns={[
            {
              header: 'Name',
              cell: (row) => (
                <button type="button" className="link" onClick={() => setEditing(row)}>
                  {row.name}
                </button>
              ),
            },
            { header: 'Days until due', align: 'right', cell: (row) => row.daysDue },
            {
              header: 'Actions',
              align: 'right',
              cell: (row) => (
                <button
                  type="button"
                  className="text-danger underline"
                  onClick={() => setRemoving(row)}
                >
                  Delete
                </button>
              ),
            },
          ]}
        />
        <TermForm key={editing?.id ?? 'new'} term={editing} onDone={() => setEditing(undefined)} />
      </div>

      <ConfirmDialog
        open={removing !== undefined}
        title="Delete these payment terms?"
        message={`${removing?.name ?? 'These terms'} will be removed for good.`}
        confirmLabel="Delete payment terms"
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  )
}
