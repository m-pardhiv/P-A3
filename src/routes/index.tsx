import { createFileRoute, redirect } from '@tanstack/react-router'
import { homeFor } from '~/lib/home-path'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    throw redirect(context.user ? homeFor(context.user.role) : { to: '/login' })
  },
})
