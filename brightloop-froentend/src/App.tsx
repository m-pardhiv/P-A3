import { MotionConfig } from 'framer-motion'
import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { homeFor } from '@/config/navigation'
import { PortalProvider, usePortal } from '@/context/portal'
import { ToastProvider } from '@/context/toast'
import LandingPage from '@/pages/landing'
import LoginPage from '@/pages/login'
import NotFoundPage from '@/pages/not-found'
import type { Role } from '@/types'

const AccountPage = lazy(() => import('@/pages/account'))
const InvoiceDetailPage = lazy(() => import('@/pages/invoice-detail'))
const InvoicesPage = lazy(() => import('@/pages/invoices'))
const OverviewPage = lazy(() => import('@/pages/overview'))
const PaymentsPage = lazy(() => import('@/pages/payments'))
const SubscriptionDetailPage = lazy(() => import('@/pages/subscription-detail'))
const SubscriptionsPage = lazy(() => import('@/pages/subscriptions'))
const SupportPage = lazy(() => import('@/pages/support'))
const BackofficeOverviewPage = lazy(() => import('@/pages/backoffice/overview'))
const CustomersPage = lazy(() => import('@/pages/backoffice/customers'))
const TicketsPage = lazy(() => import('@/pages/backoffice/tickets'))
const PlansPage = lazy(() => import('@/pages/backoffice/plans'))
const TeamPage = lazy(() => import('@/pages/backoffice/team'))

/**
 * One login, three destinations. Each area is only reachable by its own role:
 * logged-out visitors go to /login, and anyone with the wrong role is sent to their own home.
 * (This is a UX guard. A real backend must also enforce the role on every request.)
 */
function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { session, loggedOut } = usePortal()
  const location = useLocation()
  if (!session) return <Navigate to={loggedOut ? '/' : '/login'} replace state={{ from: location.pathname + location.search }} />
  if (session.role !== role) return <Navigate to={homeFor(session.role)} replace />
  return <>{children}</>
}

const shell = (role: Role) => (
  <RequireRole role={role}>
    <AppShell />
  </RequireRole>
)

export default function App() {
  return (
    // "user" respects the OS reduced-motion setting: transforms/layout animations are disabled, opacity still fades.
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <PortalProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signed-out" element={<Navigate to="/" replace />} />

              {/* Staff console */}
              <Route path="/staff" element={shell('staff')}>
                <Route index element={<BackofficeOverviewPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Admin console */}
              <Route path="/admin" element={shell('admin')}>
                <Route index element={<BackofficeOverviewPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="plans" element={<PlansPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Customer portal */}
              <Route element={shell('customer')}>
                <Route path="/overview" element={<OverviewPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/subscriptions/:id" element={<SubscriptionDetailPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PortalProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
