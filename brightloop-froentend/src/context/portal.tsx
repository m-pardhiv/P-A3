import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/api'
import type {
  AppNotification,
  Customer,
  Invoice,
  Payment,
  SessionUser,
  Subscription,
  SubscriptionAction,
  SupportRequest,
} from '@/types'

/** Data for the signed-in *customer*. Staff and admin consoles load their own data per page. */
export interface PortalData {
  customer: Customer
  subscriptions: Subscription[]
  invoices: Invoice[]
  payments: Payment[]
  notifications: AppNotification[]
  supportRequests: SupportRequest[]
}

type Status = 'loading' | 'ready' | 'error'

interface PortalContextValue {
  /** Who is logged in (and with which role), or null. */
  session: SessionUser | null
  signedIn: boolean
  /** True after an explicit logout, so the route guard can send the person home rather than to /login. */
  loggedOut: boolean
  signIn: (credentials: { email: string; password: string }) => Promise<SessionUser>
  signOut: () => void

  /** Customer data loading state (only meaningful while the session role is "customer"). */
  status: Status
  error?: string
  data: PortalData | null
  reload: () => void
  updateCustomer: (patch: Parameters<typeof api.updateCustomer>[0]) => Promise<Customer>
  changePassword: typeof api.changePassword
  runSubscriptionAction: (id: string, action: SubscriptionAction) => Promise<Subscription>
  markNotificationsRead: () => Promise<void>
  createSupportRequest: typeof api.createSupportRequest
}

const PortalContext = createContext<PortalContextValue | null>(null)

/**
 * Holds the session and, for customers, their data plus mutations. All I/O goes through `api`,
 * so replacing the mock with a real backend requires no changes here or in the UI.
 */
export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(() => api.currentSession())
  const [loggedOut, setLoggedOut] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string>()
  const [data, setData] = useState<PortalData | null>(null)
  const [attempt, setAttempt] = useState(0)

  const isCustomer = session?.role === 'customer'

  useEffect(() => {
    if (!isCustomer) return
    let cancelled = false
    setStatus('loading')
    setError(undefined)
    Promise.all([
      api.getCustomer(),
      api.listSubscriptions(),
      api.listInvoices(),
      api.listPayments(),
      api.listNotifications(),
      api.listSupportRequests(),
    ])
      .then(([customer, subscriptions, invoices, payments, notifications, supportRequests]) => {
        if (cancelled) return
        setData({ customer, subscriptions, invoices, payments, notifications, supportRequests })
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Something went wrong.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [isCustomer, attempt])

  const patch = useCallback((fn: (d: PortalData) => PortalData) => setData((d) => (d ? fn(d) : d)), [])

  const value = useMemo<PortalContextValue>(
    () => ({
      session,
      signedIn: session !== null,
      loggedOut,
      async signIn(credentials) {
        const user = await api.signIn(credentials)
        setLoggedOut(false)
        setSession(user)
        return user
      },
      signOut: () => {
        void api.signOut()
        setLoggedOut(true)
        setSession(null)
        setData(null)
        setStatus('loading')
      },
      status,
      error,
      data,
      reload: () => setAttempt((n) => n + 1),
      async updateCustomer(input) {
        const customer = await api.updateCustomer(input)
        patch((d) => ({ ...d, customer }))
        return customer
      },
      changePassword: (input) => api.changePassword(input),
      async runSubscriptionAction(id, action) {
        const updated = await api.performSubscriptionAction(id, action)
        patch((d) => ({ ...d, subscriptions: d.subscriptions.map((s) => (s.id === id ? updated : s)) }))
        return updated
      },
      async markNotificationsRead() {
        const notifications = await api.markAllNotificationsRead()
        patch((d) => ({ ...d, notifications }))
      },
      async createSupportRequest(input) {
        const request = await api.createSupportRequest(input)
        patch((d) => ({ ...d, supportRequests: [request, ...d.supportRequests] }))
        return request
      },
    }),
    [session, loggedOut, status, error, data, patch],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within PortalProvider')
  return ctx
}

/** Data accessor for components rendered inside <PortalGate>, where data is guaranteed to exist. */
export function usePortalData() {
  const { data } = usePortal()
  if (!data) throw new Error('usePortalData used before data was ready — wrap in <PortalGate>')
  return data
}

/** The logged-in person, for screens that sit behind a role guard. */
export function useSession() {
  const { session } = usePortal()
  if (!session) throw new Error('useSession used while logged out')
  return session
}
