import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { PlanForm } from '~/components/plan-form'
import { useCurrentUser } from '~/lib/use-current-user'
import { getPlan } from '~/server/functions/plans'

const planQuery = (id: string) =>
  queryOptions({
    queryKey: ['plan', id],
    queryFn: () => getPlan({ data: { id } }),
  })

export const Route = createFileRoute('/_app/plans/$id')({
  loader: ({ context, params }) => context.queryClient.query(planQuery(params.id)),
  component: PlanPage,
})

function PlanPage() {
  const { id } = Route.useParams()
  const user = useCurrentUser()
  const { data } = useSuspenseQuery(planQuery(id))

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={data.name}
        breadcrumbs={[{ label: 'Plans', to: '/plans' }]}
        description={user.role === 'admin' ? undefined : 'Only an admin can change plans.'}
      />
      <PlanForm key={data.id} plan={data} />
    </div>
  )
}
