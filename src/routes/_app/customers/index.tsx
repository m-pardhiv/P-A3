import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/customers/')({
  component: () => <PlaceholderPage title="Customers" part={2} />,
})
