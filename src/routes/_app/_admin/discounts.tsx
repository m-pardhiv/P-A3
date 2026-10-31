import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/_admin/discounts')({
  component: () => <PlaceholderPage title="Discounts" part={4} />,
})
