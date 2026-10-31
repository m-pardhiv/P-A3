import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CustomerForm } from '~/components/customer-form'
import { PageHeader } from '~/components/page-header'
import { getCustomer } from '~/server/functions/customers'

const customerQuery = (id: string) =>
  queryOptions({
    queryKey: ['customer', id],
    queryFn: () => getCustomer({ data: { id } }),
  })

export const Route = createFileRoute('/_app/customers/$id')({
  loader: ({ context, params }) => context.queryClient.query(customerQuery(params.id)),
  component: CustomerPage,
})

function CustomerPage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(customerQuery(id))

  return (
    <div className="max-w-2xl">
      <PageHeader title={data.name} breadcrumbs={[{ label: 'Customers', to: '/customers' }]} />
      <CustomerForm key={data.id} customer={data} />
    </div>
  )
}
