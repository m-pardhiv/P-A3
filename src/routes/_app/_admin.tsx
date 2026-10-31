import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

// A UI convenience only. The server functions behind these pages call requireRole('admin').
export const Route = createFileRoute('/_app/_admin')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  component: () => <Outlet />,
})
