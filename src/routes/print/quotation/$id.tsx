import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { QuotationDocument } from '~/components/quotation-document'
import { getQuotationDocument } from '~/server/functions/subscriptions'

const documentQuery = (id: string) =>
  queryOptions({
    queryKey: ['quotation-document', id],
    queryFn: () => getQuotationDocument({ data: { id } }),
  })

// Staff can print any quotation and a customer only their own, never a draft.
export const Route = createFileRoute('/print/quotation/$id')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
  },
  loader: ({ context, params }) => context.queryClient.query(documentQuery(params.id)),
  component: PrintPage,
})

function PrintPage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(documentQuery(id))
  return <QuotationDocument quotation={data.quotation} lines={data.lines} totals={data.totals} />
}
