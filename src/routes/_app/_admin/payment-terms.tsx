import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/_admin/payment-terms')({
  component: () => <PlaceholderPage title="Payment Terms" part={2} />,
})
