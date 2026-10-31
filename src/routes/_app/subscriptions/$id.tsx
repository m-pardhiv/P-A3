import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/subscriptions/$id')({
  component: () => (
    <PlaceholderPage
      title="Subscription"
      part={2}
      parent={{ label: 'Subscriptions', to: '/subscriptions' }}
    />
  ),
})
