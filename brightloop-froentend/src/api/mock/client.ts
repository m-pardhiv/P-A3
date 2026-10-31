import { addMonths, parseDate, startOfToday, toISODate } from '@/lib/format'
import { sleep } from '@/lib/utils'
import type { Role, SessionUser, Subscription, SupportRequest } from '@/types'
import { ApiError, type PortalApi } from '../types'
import { backofficeSeed } from './backoffice-seed'
import { seed } from './seed'

/** In-memory "database". Mutations live only for the lifetime of the page. */
const db = structuredClone(seed)
const bo = structuredClone(backofficeSeed)

/** Sample password shared by the preview accounts. */
export const DEMO_PASSWORD = 'brightloop'

export const PREVIEW_ACCOUNTS = [
  { role: 'customer' as const, label: 'Customer', email: seed.customer.email },
  { role: 'staff' as const, label: 'Staff', email: 'staff@brightloop.example' },
  { role: 'admin' as const, label: 'Admin', email: 'admin@brightloop.example' },
]
export const DEMO_EMAIL = PREVIEW_ACCOUNTS[0].email

/* ---------- Session ---------- */

const SESSION_KEY = 'brightloop.session'

function loadSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

function storeSession(user: SessionUser | null) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable — the session just won't survive a refresh */
  }
}

let session: SessionUser | null = loadSession()

/**
 * Server-side style authorisation. In a real backend every endpoint checks the caller's role
 * from their session; hiding links in the UI is never enough.
 */
function requireRole(...roles: Role[]) {
  if (!session) throw new ApiError('Please log in to continue.', 401)
  if (!roles.includes(session.role)) throw new ApiError('You don’t have access to this.', 403)
}

/** `?simulate=error` in the URL makes read calls fail so error states can be reviewed. */
function shouldSimulateError() {
  return new URLSearchParams(window.location.search).get('simulate') === 'error'
}

async function latency(min = 350, max = 750) {
  await sleep(min + Math.random() * (max - min))
}

async function read<T>(roles: Role[], value: () => T): Promise<T> {
  await latency()
  requireRole(...roles)
  if (shouldSimulateError()) throw new ApiError('We couldn’t reach Brightloop right now.', 503)
  return structuredClone(value())
}

async function write<T>(roles: Role[], run: () => T, min = 400, max = 800): Promise<T> {
  await latency(min, max)
  requireRole(...roles)
  return structuredClone(run())
}

const CUSTOMER: Role[] = ['customer']
const BACKOFFICE: Role[] = ['staff', 'admin']
const ADMIN: Role[] = ['admin']

const TERM_MONTHS = 12

function applyAction(subscription: Subscription, action: Parameters<PortalApi['performSubscriptionAction']>[1]) {
  const { permissions: p } = subscription
  const today = toISODate(startOfToday())
  const eventId = `t${subscription.timeline.length + 1}`
  const withoutUpcoming = () => subscription.timeline.filter((e) => e.kind !== 'upcoming')

  switch (action) {
    case 'pause': {
      if (!p.canPause || subscription.status !== 'active') throw new ApiError('Pausing isn’t available for this plan.', 403)
      subscription.status = 'paused'
      subscription.timeline = [
        ...withoutUpcoming(),
        { id: eventId, date: today, kind: 'paused', title: 'Subscription paused', description: 'Billing stopped at your request' },
      ]
      break
    }
    case 'resume': {
      if (!p.canResume || subscription.status !== 'paused') throw new ApiError('This subscription can’t be resumed.', 403)
      subscription.status = 'active'
      subscription.timeline = [
        ...subscription.timeline,
        { id: eventId, date: today, kind: 'resumed', title: 'Subscription resumed', description: 'Billing restarted' },
        { id: `${eventId}u`, date: subscription.expiryDate, kind: 'upcoming', title: 'Renewal due' },
      ]
      break
    }
    case 'renew': {
      if (!p.canRenew || (subscription.status !== 'active' && subscription.status !== 'closed'))
        throw new ApiError('Renewal isn’t available for this subscription.', 403)
      const reactivating = subscription.status === 'closed'
      const base = reactivating ? startOfToday() : parseDate(subscription.expiryDate)
      if (reactivating) subscription.startDate = today
      subscription.expiryDate = toISODate(addMonths(base, TERM_MONTHS))
      subscription.status = 'active'
      subscription.timeline = [
        ...withoutUpcoming(),
        {
          id: eventId,
          date: today,
          kind: 'renewed',
          title: reactivating ? 'Subscription reactivated' : 'Subscription renewed',
          description: `New term runs to ${subscription.expiryDate}`,
        },
        { id: `${eventId}u`, date: subscription.expiryDate, kind: 'upcoming', title: 'Renewal due' },
      ]
      break
    }
    case 'cancel': {
      if (!p.canCancel || subscription.status === 'closed') throw new ApiError('Cancellation isn’t available online for this plan.', 403)
      const wasPending = subscription.status === 'pending'
      subscription.status = 'closed'
      if (wasPending) subscription.expiryDate = today
      subscription.timeline = [
        ...withoutUpcoming(),
        {
          id: eventId,
          date: today,
          kind: 'cancelled',
          title: 'Subscription cancelled',
          description: wasPending ? 'Cancelled before activation' : `Access continues until ${subscription.expiryDate}`,
        },
      ]
      break
    }
  }
}

const accounts: { email: () => string[]; user: () => SessionUser }[] = [
  {
    email: () => [seed.customer.email, db.customer.email],
    user: () => ({ id: db.customer.id, role: 'customer', name: db.customer.fullName, email: db.customer.email }),
  },
  {
    email: () => ['staff@brightloop.example'],
    user: () => ({ id: 'usr_staff1', role: 'staff', name: 'Sam Rivera', email: 'staff@brightloop.example' }),
  },
  {
    email: () => ['admin@brightloop.example'],
    user: () => ({ id: 'usr_admin1', role: 'admin', name: 'Priya Nair', email: 'admin@brightloop.example' }),
  },
]

export const mockApi: PortalApi = {
  currentSession: () => session,

  async signIn({ email, password }) {
    await latency(500, 900)
    const wanted = email.trim().toLowerCase()
    const match = accounts.find((a) => a.email().some((e) => e.toLowerCase() === wanted))
    if (!match || password !== DEMO_PASSWORD) throw new ApiError('That email and password don’t match. Please try again.', 401)
    const user = match.user()
    if (user.role !== 'customer') {
      const member = bo.team.find((m) => m.id === user.id)
      if (member && !member.active) throw new ApiError('This account has been deactivated.', 403)
    }
    session = user
    storeSession(user)
    return structuredClone(user)
  },

  async signOut() {
    session = null
    storeSession(null)
  },

  // ----- Customer -----
  getCustomer: () => read(CUSTOMER, () => db.customer),

  async updateCustomer(patch) {
    return write(CUSTOMER, () => {
      if (patch.email !== undefined && !/^\S+@\S+\.\S+$/.test(patch.email)) throw new ApiError('Enter a valid email address.', 422)
      db.customer = { ...db.customer, ...patch, billingAddress: { ...db.customer.billingAddress, ...patch.billingAddress } }
      return db.customer
    })
  },

  async changePassword({ currentPassword, newPassword }) {
    await write(CUSTOMER, () => {
      if (currentPassword !== DEMO_PASSWORD) throw new ApiError('Your current password is incorrect.', 401)
      if (newPassword === currentPassword) throw new ApiError('Choose a password you haven’t used before.', 422)
    }, 500, 900)
  },

  listSubscriptions: () => read(CUSTOMER, () => db.subscriptions),

  performSubscriptionAction: (id, action) =>
    write(
      CUSTOMER,
      () => {
        const subscription = db.subscriptions.find((s) => s.id === id)
        if (!subscription) throw new ApiError('Subscription not found.', 404)
        applyAction(subscription, action)
        return subscription
      },
      500,
      900,
    ),

  listInvoices: () => read(CUSTOMER, () => db.invoices),
  listPayments: () => read(CUSTOMER, () => db.payments),

  listNotifications: () => read(CUSTOMER, () => db.notifications),
  markAllNotificationsRead: () =>
    write(
      CUSTOMER,
      () => {
        db.notifications = db.notifications.map((n) => ({ ...n, read: true }))
        return db.notifications
      },
      150,
      300,
    ),

  listSupportRequests: () => read(CUSTOMER, () => db.supportRequests),
  createSupportRequest: (input) =>
    write(
      CUSTOMER,
      () => {
        const request: SupportRequest = {
          id: `SR-${1049 + db.supportRequests.length}`,
          createdAt: toISODate(startOfToday()),
          status: 'received',
          ...input,
        }
        db.supportRequests = [request, ...db.supportRequests]
        // The same request shows up in the staff queue.
        bo.tickets = [
          { ...request, customerName: db.customer.fullName, company: db.customer.companyName, priority: 'normal' },
          ...bo.tickets,
        ]
        return request
      },
      500,
      900,
    ),

  // ----- Back office -----
  getBackofficeSummary: () =>
    read(BACKOFFICE, () => ({
      mrr: bo.mrr,
      activeSubscriptions: bo.customers.reduce((n, c) => n + c.activeSubscriptions, 0),
      customers: bo.customers.length,
      overdueAccounts: bo.customers.filter((c) => c.status === 'overdue').length,
      openTickets: bo.tickets.filter((t) => t.status !== 'resolved').length,
      revenueByMonth: bo.revenueByMonth,
    })),
  listCustomers: () => read(BACKOFFICE, () => bo.customers),
  listTickets: () => read(BACKOFFICE, () => bo.tickets),
  updateTicketStatus: (id, status) =>
    write(
      BACKOFFICE,
      () => {
        const ticket = bo.tickets.find((t) => t.id === id)
        if (!ticket) throw new ApiError('Ticket not found.', 404)
        ticket.status = status
        const request = db.supportRequests.find((r) => r.id === id)
        if (request) request.status = status
        return ticket
      },
      250,
      500,
    ),

  // ----- Admin only -----
  listTeam: () => read(ADMIN, () => bo.team),
  setTeamMemberActive: (id, active) =>
    write(
      ADMIN,
      () => {
        const member = bo.team.find((m) => m.id === id)
        if (!member) throw new ApiError('Team member not found.', 404)
        if (member.id === session?.id) throw new ApiError('You can’t deactivate your own account.', 422)
        member.active = active
        return member
      },
      300,
      600,
    ),
  listPlans: () => read(ADMIN, () => bo.plans),
  updatePlanPermissions: (id, patch) =>
    write(
      ADMIN,
      () => {
        const plan = bo.plans.find((p) => p.id === id)
        if (!plan) throw new ApiError('Plan not found.', 404)
        plan.permissions = { ...plan.permissions, ...patch }
        // Plan configuration is what drives which actions customers are offered.
        for (const s of db.subscriptions) {
          if (s.productName === plan.productName && s.planName === plan.planName) s.permissions = { ...plan.permissions }
        }
        return plan
      },
      250,
      500,
    ),
}
