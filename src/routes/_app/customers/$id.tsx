import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/customers/$id')({
  component: () => (
    <PlaceholderPage title="Customer" part={2} parent={{ label: 'Customers', to: '/customers' }} />
  ),
})
