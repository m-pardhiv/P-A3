import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { InvoiceDocument } from '~/components/invoice-document'
import { getInvoiceDocument } from '~/server/functions/invoices'

const documentQuery = (id: string) =>
  queryOptions({
    queryKey: ['invoice-document', id],
    queryFn: () => getInvoiceDocument({ data: { id } }),
  })

// No sidebar and no portal header: this page exists to be printed. Staff can print any invoice and
// a customer only their own, because the server function applies the same scope as the portal.
export const Route = createFileRoute('/print/invoice/$id')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
  },
  loader: ({ context, params }) => context.queryClient.query(documentQuery(params.id)),
  component: PrintPage,
})

function PrintPage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(documentQuery(id))
  return <InvoiceDocument invoice={data.invoice} lines={data.lines} payments={data.payments} />
}
