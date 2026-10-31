import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/portal/profile')({
  component: () => <PlaceholderPage title="Profile" part={4} />,
})
