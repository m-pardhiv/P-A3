import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { FormField } from '~/components/form-field'
import { PageHeader } from '~/components/page-header'
import { useToast } from '~/components/toast'
import { formatDate, formatDateTime } from '~/lib/format'
import { listBillingRuns, runBillingNow } from '~/server/functions/billing'
import { billingRunsSchema } from '~/shared/schemas/invoices'

const runsQuery = (page: number) =>
  queryOptions({
    queryKey: ['billing-runs', page],
    queryFn: () => listBillingRuns({ data: { page } }),
  })

export const Route = createFileRoute('/_app/billing')({
  validateSearch: billingRunsSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.query(runsQuery(deps.page)),
  component: BillingPage,
})

type RunResult = Extract<Awaited<ReturnType<typeof runBillingNow>>, { ok: true }>['data']

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

function BillingPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(runsQuery(page))
  const queryClient = useQueryClient()
  const toast = useToast()
  const [asOf, setAsOf] = useState(data.today)
  const [dateError, setDateError] = useState<string>()
  const [result, setResult] = useState<RunResult>()

  const run = useMutation({
    mutationFn: () => runBillingNow({ data: { asOf } }),
    onSuccess: async (response) => {
      if (!response.ok) return toast('Billing could not run. Try again.', 'danger')
      setResult(response.data)
      await queryClient.invalidateQueries()
      const { created, errors } = response.data
      toast(
        errors > 0
          ? `Billing finished with ${plural(errors, 'error')}`
          : created === 0
            ? 'Billing ran. Nothing was due'
            : `Billing created ${plural(created, 'invoice')}`,
        errors > 0 ? 'danger' : 'success',
      )
    },
    onError: () => toast('Billing could not run. Try again.', 'danger'),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
      setDateError('Choose a date')
      return
    }
    setDateError(undefined)
    run.mutate()
  }

  const failed = result?.subscriptions.filter((s) => s.error) ?? []

  return (
    <>
      <PageHeader
        title="Billing"
        description="Billing creates a draft invoice for every period a subscription has reached. It also runs by itself once a day."
      />

      <section className="panel mb-6">
        <h2 className="mb-1 text-xl font-semibold">Run billing now</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Running it again for the same date creates nothing new, so it is safe to press twice.
        </p>
        <form onSubmit={submit} method="post" noValidate className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <FormField
              label="Bill everything due up to"
              required
              name="asOf"
              type="date"
              value={asOf}
              onChange={(event) => setAsOf(event.target.value)}
              error={dateError}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={run.isPending}>
            {run.isPending ? 'Running billing' : 'Run billing now'}
          </button>
        </form>

        {result ? (
          <div role="status" className="mt-5 rounded-control bg-neutral-soft p-4">
            <p className="font-medium">
              Billed up to {formatDate(result.asOf)}: {plural(result.created, 'invoice')} created,{' '}
              {result.skipped} skipped, {plural(result.errors, 'error')}.
            </p>
            <p className="text-sm text-muted-foreground">
              {plural(result.activated, 'subscription')} activated and{' '}
              {plural(result.closed, 'subscription')} closed.
            </p>
            {result.created > 0 ? (
              <Link
                to="/invoices"
                search={{ status: 'draft', page: 1 }}
                className="link mt-2 inline-block"
              >
                Review the draft invoices
              </Link>
            ) : null}
            {failed.length > 0 ? (
              <ul className="mt-3 text-sm text-danger">
                {failed.map((f) => (
                  <li key={f.subscriptionId}>
                    {f.number || f.subscriptionId}: {f.error}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <h2 className="mb-3 text-xl font-semibold">Run history</h2>
      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(next) => navigate({ search: { page: next } })}
        empty={
          <EmptyState
            title="Billing has not run yet"
            message="Run it above, or wait for the daily run, and each run will be listed here."
          />
        }
        columns={[
          {
            header: 'Ran at',
            cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.runAt)}</span>,
          },
          {
            header: 'Billed up to',
            cell: (row) => <span className="whitespace-nowrap">{formatDate(row.asOfDate)}</span>,
          },
          { header: 'Started by', cell: (row) => row.triggeredByName ?? 'Daily job' },
          { header: 'Created', align: 'right', cell: (row) => row.createdCount },
          { header: 'Skipped', align: 'right', cell: (row) => row.skippedCount },
          {
            header: 'Errors',
            align: 'right',
            cell: (row) =>
              row.errorCount > 0 ? (
                <span className="font-medium text-danger">{row.errorCount}</span>
              ) : (
                row.errorCount
              ),
          },
          { header: 'Activated', align: 'right', cell: (row) => row.details?.activated ?? 0 },
          { header: 'Closed', align: 'right', cell: (row) => row.details?.closed ?? 0 },
        ]}
      />
    </>
  )
}
