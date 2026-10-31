import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/payments')({
  component: () => <PlaceholderPage title="Payments" part={3} />,
})
