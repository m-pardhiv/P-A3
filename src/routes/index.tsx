import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '~/components/landing/landing-page'

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Brightloop · Billing and subscriptions' }] }),
  component: () => <LandingPage user={Route.useRouteContext().user} />,
})
