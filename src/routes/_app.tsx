import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppLayout } from '~/components/app-layout'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
    if (context.user.role === 'customer')
      throw redirect({ to: '/portal/subscriptions', search: { page: 1 } })
    return { user: context.user }
  },
  component: AppRoute,
})

function AppRoute() {
  const { user } = Route.useRouteContext()
  return (
    <AppLayout user={user}>
      <Outlet />
    </AppLayout>
  )
}
