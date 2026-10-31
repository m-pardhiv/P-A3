import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/portal/subscriptions/')({
  component: () => <PlaceholderPage title="My Subscriptions" part={4} />,
})
