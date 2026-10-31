import { createFileRoute, redirect } from '@tanstack/react-router'
import { homePathFor } from '~/lib/home-path'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    throw redirect({ to: context.user ? homePathFor(context.user.role) : '/login' })
  },
})
