import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/portal/invoices/')({
  component: () => <PlaceholderPage title="My Invoices" part={4} />,
})
