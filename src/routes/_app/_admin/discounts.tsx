import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { CheckboxField, FormError, FormField, SelectField } from '~/components/form-field'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { useToast } from '~/components/toast'
import { useZodForm } from '~/components/use-zod-form'
import { formatDate, formatMoney, paiseToInput } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import { deleteDiscount, listDiscounts, saveDiscount } from '~/server/functions/discounts'
import { discountListSchema, discountSchema } from '~/shared/schemas/discounts'

const discountsQuery = (page: number) =>
  queryOptions({
    queryKey: ['discounts', page],
    queryFn: () => listDiscounts({ data: { page } }),
  })

export const Route = createFileRoute('/_app/_admin/discounts')({
  validateSearch: discountListSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query(discountsQuery(deps.page)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: DiscountsPage,
})

type Discount = Awaited<ReturnType<typeof listDiscounts>>['rows'][number]

const valueLabel = (d: Pick<Discount, 'kind' | 'value'>) =>
  d.kind === 'percent' ? `${d.value}%` : formatMoney(d.value)

function DiscountForm({ discount, onDone }: { discount?: Discount; onDone: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: options } = useSuspenseQuery(formOptionsQuery)
  // The value means a percentage or rupees, and the product only matters for a product discount.
  const [kind, setKind] = useState<string>(discount?.kind ?? 'percent')
  const [scope, setScope] = useState<string>(discount?.scope ?? 'subscription')

  const form = useZodForm({
    schema: discountSchema,
    submit: (input) => saveDiscount({ data: input }),
    onSuccess: (_, element) => {
      element.reset()
      queryClient.invalidateQueries()
      toast(discount ? 'Discount saved' : 'Discount created')
      onDone()
    },
  })

  const initialValue = discount
    ? discount.kind === 'percent'
      ? String(discount.value)
      : paiseToInput(discount.value)
    : ''

  return (
    <section className="panel">
      <h2 className="mb-4 text-xl font-semibold">{discount ? 'Edit discount' : 'New discount'}</h2>
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={form.formError} />
        <input type="hidden" name="id" value={discount?.id ?? ''} />
        <FormField
          label="Name"
          name="name"
          defaultValue={discount?.name}
          error={form.fieldErrors.name}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            options={[
              { value: 'percent', label: 'Percentage' },
              { value: 'fixed', label: 'Fixed amount' },
            ]}
            error={form.fieldErrors.kind}
          />
          <FormField
            label={kind === 'percent' ? 'Percentage off' : 'Amount off (₹)'}
            name="value"
            inputMode="decimal"
            defaultValue={initialValue}
            error={form.fieldErrors.value}
          />
        </div>
        <SelectField
          label="Applies to"
          name="scope"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          options={[
            { value: 'subscription', label: 'The whole subscription' },
            { value: 'product', label: 'One product' },
          ]}
          hint="At most one discount applies per product line and one per subscription, whichever saves most."
          error={form.fieldErrors.scope}
        />
        {scope === 'product' ? (
          <SelectField
            label="Product"
            name="productId"
            defaultValue={discount?.productId ?? ''}
            placeholder="Choose a product"
            options={options.products.map((p) => ({ value: p.id, label: p.name }))}
            error={form.fieldErrors.productId}
          />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Minimum purchase (₹)"
            name="minPurchaseAmount"
            inputMode="decimal"
            defaultValue={discount ? paiseToInput(discount.minPurchaseAmount) : '0'}
            error={form.fieldErrors.minPurchaseAmount}
          />
          <FormField
            label="Minimum quantity"
            name="minQuantity"
            inputMode="numeric"
            defaultValue={discount?.minQuantity ?? 1}
            error={form.fieldErrors.minQuantity}
          />
          <FormField
            label="Starts on"
            name="startDate"
            type="date"
            defaultValue={discount?.startDate ?? options.today}
            error={form.fieldErrors.startDate}
          />
          <FormField
            label="Ends on"
            name="endDate"
            type="date"
            defaultValue={discount?.endDate}
            error={form.fieldErrors.endDate}
          />
        </div>
        <FormField
          label="Number of uses allowed"
          name="usageLimit"
          inputMode="numeric"
          defaultValue={discount?.usageLimit ?? 10}
          hint="It stops by itself once it has been used this many times, or after its end date."
          error={form.fieldErrors.usageLimit}
        />
        <CheckboxField label="Active" name="active" defaultChecked={discount?.active ?? true} />
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={form.pending}>
            {form.pending ? 'Saving' : discount ? 'Save discount' : 'Create discount'}
          </button>
          {discount ? (
            <button type="button" className="btn btn-secondary" onClick={onDone}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}

function DiscountsPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(discountsQuery(page))
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<Discount>()
  const [removing, setRemoving] = useState<Discount>()

  const remove = useMutation({
    mutationFn: (id: string) => deleteDiscount({ data: { id } }),
    onSuccess: (result) => {
      setRemoving(undefined)
      if (result.ok) {
        queryClient.invalidateQueries()
        toast('Discount deleted')
      } else {
        toast(result.error ?? 'That discount could not be deleted', 'danger')
      }
    },
  })

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Billing applies a qualifying discount to each new invoice, on its own."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <DataTable
          data={data}
          rowKey={(row) => row.id}
          onPageChange={(next) => navigate({ search: { page: next } })}
          empty={<EmptyState title="No discounts yet" message="Create the first discount." />}
          columns={[
            {
              header: 'Name',
              cell: (row) => (
                <button type="button" className="link text-left" onClick={() => setEditing(row)}>
                  {row.name}
                </button>
              ),
            },
            { header: 'Off', align: 'right', cell: valueLabel },
            {
              header: 'Applies to',
              cell: (row) =>
                row.scope === 'product' ? (row.productName ?? 'A product') : 'Whole subscription',
            },
            {
              header: 'Needs',
              cell: (row) => `${formatMoney(row.minPurchaseAmount)} and ${row.minQuantity}+`,
            },
            {
              header: 'Valid',
              cell: (row) => (
                <span className="whitespace-nowrap">
                  {formatDate(row.startDate)} to {formatDate(row.endDate)}
                </span>
              ),
            },
            {
              header: 'Used',
              align: 'right',
              cell: (row) => `${row.usedCount} of ${row.usageLimit}`,
            },
            { header: 'State', cell: (row) => <StatusBadge status={row.state} /> },
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
        <DiscountForm
          key={editing?.id ?? 'new'}
          discount={editing}
          onDone={() => setEditing(undefined)}
        />
      </div>

      <ConfirmDialog
        open={removing !== undefined}
        title="Delete this discount?"
        message={`${removing?.name ?? 'This discount'} will be removed. If invoices already used it, switch it to inactive instead.`}
        confirmLabel="Delete discount"
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  )
}
