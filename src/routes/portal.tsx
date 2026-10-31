import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { PortalLayout } from '~/components/portal-layout'

export const Route = createFileRoute('/portal')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
    if (context.user.role !== 'customer') throw redirect({ to: '/dashboard' })
    return { user: context.user }
  },
  component: PortalRoute,
})

function PortalRoute() {
  const { user } = Route.useRouteContext()
  return (
    <PortalLayout user={user}>
      <Outlet />
    </PortalLayout>
  )
}
