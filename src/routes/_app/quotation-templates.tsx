import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/quotation-templates')({
  component: () => <PlaceholderPage title="Quotation Templates" part={2} />,
})
