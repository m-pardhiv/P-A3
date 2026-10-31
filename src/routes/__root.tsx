import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { EmptyState } from '~/components/empty-state'
import { ToastProvider } from '~/components/toast'
import { getCurrentUser } from '~/server/functions/auth'
import appCss from '~/styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => ({ user: await getCurrentUser() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Brightloop' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  component: () => <Outlet />,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="Page not found"
        message="This page does not exist, or you do not have access to it."
        action={
          <Link to="/" className="btn btn-primary mt-2">
            Go to home
          </Link>
        }
      />
    </div>
  )
}

function RouteError() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="This page could not load"
        message="Reload the page. If it keeps happening, sign in again."
        action={
          <Link to="/" className="btn btn-primary mt-2">
            Go to home
          </Link>
        }
      />
    </div>
  )
}
