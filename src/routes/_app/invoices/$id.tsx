import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/invoices/$id')({
  component: () => (
    <PlaceholderPage title="Invoice" part={3} parent={{ label: 'Invoices', to: '/invoices' }} />
  ),
})
