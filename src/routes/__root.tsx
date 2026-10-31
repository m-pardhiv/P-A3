import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AppLayout } from '~/components/app-layout'
import { EmptyState } from '~/components/empty-state'
import { NotFoundPage } from '~/components/not-found-page'
import { PortalLayout } from '~/components/portal-layout'
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

/**
 * A notFound thrown in a server function reaches the client without its route, so it always
 * lands here. Wrapping it in the signed-in user's layout keeps the sidebar on a missing record.
 */
function NotFound() {
  const { user } = Route.useRouteContext()
  const page = <NotFoundPage />
  if (!user) return page
  return user.role === 'customer' ? (
    <PortalLayout user={user}>{page}</PortalLayout>
  ) : (
    <AppLayout user={user}>{page}</AppLayout>
  )
}

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
