import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/portal/subscriptions/$id')({
  component: () => (
    <PlaceholderPage
      title="Subscription"
      part={4}
      parent={{ label: 'My Subscriptions', to: '/portal/subscriptions' }}
    />
  ),
})
