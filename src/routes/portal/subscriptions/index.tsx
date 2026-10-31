import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { PillTabs } from '~/components/design/pill-tabs'
import { EmptyState } from '~/components/empty-state'
import { PageHeader } from '~/components/page-header'
import { SubscriptionCard } from '~/components/portal/subscription-card'
import { Card } from '~/components/ui/card'
import { staggerContainer } from '~/lib/motion'
import { listMySubscriptions } from '~/server/functions/portal'
import { portalSubscriptionListSchema } from '~/shared/schemas/portal'

type Search = { page: number; group?: 'active' | 'upcoming' | 'paused' | 'closed' }

const subscriptionsQuery = (search: Search) =>
  queryOptions({
    queryKey: ['portal', 'subscriptions', search],
    queryFn: () => listMySubscriptions({ data: search }),
  })

export const Route = createFileRoute('/portal/subscriptions/')({
  validateSearch: portalSubscriptionListSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.query(subscriptionsQuery(deps)),
  component: MySubscriptionsPage,
})

function MySubscriptionsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(subscriptionsQuery(search))
  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize))

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Subscriptions"
        description="Everything you subscribe to with Brightloop. Select a subscription to see its pricing, history and what you can change."
      />

      <PillTabs
        label="Filter subscriptions"
        value={search.group ?? 'all'}
        onChange={(value) =>
          navigate({ search: { page: 1, group: value === 'all' ? undefined : value } })
        }
        tabs={[
          { value: 'all', label: 'All', count: data.counts.all },
          { value: 'active', label: 'Active', count: data.counts.active },
          { value: 'upcoming', label: 'Upcoming', count: data.counts.upcoming },
          { value: 'paused', label: 'Paused', count: data.counts.paused },
          { value: 'closed', label: 'Closed', count: data.counts.closed },
        ]}
      />

      {data.rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title={
              search.group ? `No ${search.group} subscriptions` : 'You have no subscriptions yet'
            }
            message={
              search.group
                ? 'When you have a subscription in this state, it will show up here.'
                : 'When Brightloop sets one up for you, it will appear here.'
            }
          />
        </Card>
      ) : (
        <motion.div
          key={search.group ?? 'all'}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {data.rows.map((row) => (
            <SubscriptionCard key={row.id} sub={row} today={data.today} />
          ))}
        </motion.div>
      )}

      {lastPage > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular">
            Page {data.page} of {lastPage}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={data.page <= 1}
              onClick={() => navigate({ search: { ...search, page: data.page - 1 } })}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={data.page >= lastPage}
              onClick={() => navigate({ search: { ...search, page: data.page + 1 } })}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
