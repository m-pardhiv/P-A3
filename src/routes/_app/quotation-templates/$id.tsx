import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { TemplateForm } from '~/components/template-form'
import { formOptionsQuery } from '~/lib/queries'
import { getTemplate } from '~/server/functions/quotation-templates'

const templateQuery = (id: string) =>
  queryOptions({
    queryKey: ['template', id],
    queryFn: () => getTemplate({ data: { id } }),
  })

export const Route = createFileRoute('/_app/quotation-templates/$id')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.query(templateQuery(params.id)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: TemplatePage,
})

function TemplatePage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(templateQuery(id))
  const { data: options } = useSuspenseQuery(formOptionsQuery)

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={data.name}
        breadcrumbs={[{ label: 'Quotation Templates', to: '/quotation-templates' }]}
        actions={
          <Link to="/subscriptions/new" search={{ templateId: id }} className="btn btn-secondary">
            Use template
          </Link>
        }
      />
      <TemplateForm key={data.id} template={data} options={options} />
    </div>
  )
}
