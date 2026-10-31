import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { FormError, FormField } from '~/components/form-field'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { useToast } from '~/components/toast'
import { useZodForm } from '~/components/use-zod-form'
import { createStaff, listStaff } from '~/server/functions/staff'
import { createStaffSchema } from '~/shared/schemas/auth'
import { paginationSchema } from '~/shared/schemas/pagination'

const staffQuery = (page: number) =>
  queryOptions({
    queryKey: ['staff', page],
    queryFn: () => listStaff({ data: { page } }),
  })

export const Route = createFileRoute('/_app/_admin/staff')({
  validateSearch: paginationSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.query(staffQuery(deps.page)),
  component: StaffPage,
})

function StaffPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(staffQuery(page))
  const queryClient = useQueryClient()
  const toast = useToast()

  const form = useZodForm({
    schema: createStaffSchema,
    submit: (input) => createStaff({ data: input }),
    onSuccess: (_, element) => {
      element.reset()
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast('Staff account created')
    },
  })

  return (
    <>
      <PageHeader title="Staff" description="People who can work in this console." />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <DataTable
          data={data}
          rowKey={(row) => row.id}
          onPageChange={(next) => navigate({ search: { page: next } })}
          empty={<EmptyState title="No staff yet" message="Create the first account here." />}
          columns={[
            { header: 'Name', cell: (row) => row.name },
            { header: 'Email', cell: (row) => row.email },
            { header: 'Role', cell: (row) => <StatusBadge status={row.role} /> },
          ]}
        />
        <section className="rounded-panel border border-line bg-surface p-5">
          <h2 className="mb-4 text-xl font-semibold">Create staff account</h2>
          <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
            <FormError message={form.formError} />
            <FormField label="Name" name="name" error={form.fieldErrors.name} />
            <FormField label="Email" name="email" type="email" error={form.fieldErrors.email} />
            <FormField
              label="Temporary password"
              name="password"
              type="password"
              autoComplete="new-password"
              error={form.fieldErrors.password}
            />
            <button type="submit" className="btn btn-primary" disabled={form.pending}>
              {form.pending ? 'Creating account' : 'Create staff account'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
