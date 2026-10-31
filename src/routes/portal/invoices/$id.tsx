import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/portal/invoices/$id')({
  component: () => (
    <PlaceholderPage
      title="Invoice"
      part={4}
      parent={{ label: 'My Invoices', to: '/portal/invoices' }}
    />
  ),
})
