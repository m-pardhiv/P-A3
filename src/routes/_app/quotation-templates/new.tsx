import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { TemplateForm } from '~/components/template-form'
import { formOptionsQuery } from '~/lib/queries'

export const Route = createFileRoute('/_app/quotation-templates/new')({
  loader: ({ context }) => context.queryClient.query(formOptionsQuery),
  component: NewTemplatePage,
})

function NewTemplatePage() {
  const { data: options } = useSuspenseQuery(formOptionsQuery)
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New template"
        breadcrumbs={[{ label: 'Quotation Templates', to: '/quotation-templates' }]}
      />
      <TemplateForm options={options} />
    </div>
  )
}
