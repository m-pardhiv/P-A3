import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/subscriptions/')({
  component: () => <PlaceholderPage title="Subscriptions" part={2} />,
})
