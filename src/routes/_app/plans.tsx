import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/plans')({
  component: () => <PlaceholderPage title="Plans" part={2} />,
})
