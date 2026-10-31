import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { CheckboxField, FormError, FormField, SelectField } from '~/components/form-field'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { useToast } from '~/components/toast'
import { useZodForm } from '~/components/use-zod-form'
import { capitalize } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import { listTaxRules, saveTaxRule } from '~/server/functions/taxes'
import { PRODUCT_TYPES, taxRuleSchema } from '~/shared/schemas/catalogue'
import { paginationSchema } from '~/shared/schemas/pagination'

const rulesQuery = (page: number) =>
  queryOptions({
    queryKey: ['tax-rules', page],
    queryFn: () => listTaxRules({ data: { page } }),
  })

export const Route = createFileRoute('/_app/_admin/taxes')({
  validateSearch: paginationSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query(rulesQuery(deps.page)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: TaxesPage,
})

type Rule = Awaited<ReturnType<typeof listTaxRules>>['rows'][number]

function RuleForm({ rule, onDone }: { rule?: Rule; onDone: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: options } = useSuspenseQuery(formOptionsQuery)

  const form = useZodForm({
    schema: taxRuleSchema,
    submit: (input) => saveTaxRule({ data: input }),
    onSuccess: (_, element) => {
      element.reset()
      queryClient.invalidateQueries()
      toast(rule ? 'Tax rule saved' : 'Tax rule created')
      onDone()
    },
  })

  return (
    <section className="panel">
      <h2 className="mb-4 text-xl font-semibold">{rule ? 'Edit tax rule' : 'New tax rule'}</h2>
      <form onSubmit={form.onSubmit} method="post" noValidate className="flex flex-col gap-4">
        <FormError message={form.formError} />
        <input type="hidden" name="id" value={rule?.id ?? ''} />
        <FormField
          label="Name"
          required
          name="name"
          defaultValue={rule?.name}
          error={form.fieldErrors.name}
        />
        <FormField
          label="Rate (%)"
          required
          name="ratePercent"
          inputMode="decimal"
          defaultValue={rule?.ratePercent}
          error={form.fieldErrors.ratePercent}
        />
        <SelectField
          label="Product type"
          name="productType"
          defaultValue={rule?.productType ?? ''}
          placeholder="Any type"
          options={PRODUCT_TYPES.map((type) => ({ value: type, label: capitalize(type) }))}
          error={form.fieldErrors.productType}
        />
        <SelectField
          label="Product"
          name="productId"
          defaultValue={rule?.productId ?? ''}
          placeholder="Any product"
          options={options.products.map((p) => ({ value: p.id, label: p.name }))}
          error={form.fieldErrors.productId}
        />
        <CheckboxField
          label="Default rule"
          name="isDefault"
          defaultChecked={rule?.isDefault}
          hint="Applies when no product or type rule matches."
          error={form.fieldErrors.isDefault}
        />
        <CheckboxField label="Active" name="active" defaultChecked={rule?.active ?? true} />
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={form.pending}>
            {form.pending ? 'Saving' : rule ? 'Save tax rule' : 'Create tax rule'}
          </button>
          {rule ? (
            <button type="button" className="btn btn-secondary" onClick={onDone}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}

function TaxesPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(rulesQuery(page))
  const [editing, setEditing] = useState<Rule>()

  return (
    <>
      <PageHeader
        title="Taxes"
        description="A product uses its own rule first, then its type's rule, then the default."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <DataTable
          data={data}
          rowKey={(row) => row.id}
          onPageChange={(next) => navigate({ search: { page: next } })}
          empty={<EmptyState title="No tax rules yet" message="Create the default rule first." />}
          columns={[
            {
              header: 'Name',
              cell: (row) => (
                <button type="button" className="link" onClick={() => setEditing(row)}>
                  {row.name}
                </button>
              ),
            },
            { header: 'Rate', align: 'right', cell: (row) => `${row.ratePercent}%` },
            {
              header: 'Applies to',
              cell: (row) =>
                row.isDefault
                  ? 'Default'
                  : (row.productName ?? capitalize(row.productType ?? 'Nothing')),
            },
            {
              header: 'Status',
              cell: (row) => <StatusBadge status={row.active ? 'active' : 'inactive'} />,
            },
          ]}
        />
        <RuleForm key={editing?.id ?? 'new'} rule={editing} onDone={() => setEditing(undefined)} />
      </div>
    </>
  )
}
