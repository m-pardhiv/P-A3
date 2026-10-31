import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { EmptyState } from '~/components/empty-state'
import { PageHeader } from '~/components/page-header'
import { capitalize, formatDate, formatMoney } from '~/lib/format'
import { listAvailablePlans } from '~/server/functions/portal'

const plansQuery = queryOptions({
  queryKey: ['portal', 'plans'],
  queryFn: () => listAvailablePlans(),
})

export const Route = createFileRoute('/portal/plans')({
  loader: ({ context }) => context.queryClient.query(plansQuery),
  component: PlansPage,
})

function PlansPage() {
  const { data } = useSuspenseQuery(plansQuery)

  return (
    <>
      <PageHeader
        title="Plans"
        description="The plans Brightloop offers today. Ask your account contact to start one."
      />
      {data.plans.length === 0 ? (
        <EmptyState title="No plans are open right now" message="Check back soon." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.plans.map((plan) => (
            <li key={plan.id} className="panel flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="tabular text-2xl font-semibold text-ink">
                  {formatMoney(plan.price)}{' '}
                  <span className="text-base font-normal text-muted">
                    {capitalize(plan.billingPeriod).toLowerCase()}
                  </span>
                </p>
              </div>
              <ul className="flex flex-col gap-1 text-sm">
                <li className="flex items-center gap-2">
                  <Check size={16} aria-hidden /> Minimum quantity {plan.minQuantity}
                </li>
                {plan.pausable ? (
                  <li className="flex items-center gap-2">
                    <Check size={16} aria-hidden /> Can be paused
                  </li>
                ) : null}
                {plan.closable ? (
                  <li className="flex items-center gap-2">
                    <Check size={16} aria-hidden /> Can be closed early
                  </li>
                ) : null}
                {plan.renewable ? (
                  <li className="flex items-center gap-2">
                    <Check size={16} aria-hidden /> Can be renewed
                  </li>
                ) : null}
                {plan.autoClose ? (
                  <li className="flex items-center gap-2">
                    <Check size={16} aria-hidden /> Closes by itself when it ends
                  </li>
                ) : null}
              </ul>
              {plan.availableTo ? (
                <p className="text-sm text-muted">Available until {formatDate(plan.availableTo)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
