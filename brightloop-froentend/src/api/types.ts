import type {
  AppNotification,
  BackofficeCustomer,
  BackofficeSummary,
  Customer,
  Invoice,
  Payment,
  PlanConfig,
  SessionUser,
  Subscription,
  SubscriptionAction,
  SubscriptionPermissions,
  SupportRequest,
  TeamMember,
  Ticket,
  TicketStatus,
} from '@/types'

/**
 * The contract the UI depends on. Every method is scoped to the signed-in customer: a real
 * backend must derive the customer from the session/token (never from a client-supplied id)
 * so one customer can never read another's data.
 *
 * To connect a backend, implement this interface (e.g. with `fetch`) and export it from
 * `src/api/index.ts` instead of the mock.
 */
export interface PortalApi {
  /**
   * Current session, if any. The mock reads it synchronously from tab storage; a real client would
   * decode it from its token/cookie and still have the server enforce the role on every request.
   */
  currentSession(): SessionUser | null
  /** Verifies credentials and returns who signed in, including their role. */
  signIn(input: { email: string; password: string }): Promise<SessionUser>
  signOut(): Promise<void>

  // ----- Customer (role: customer) -----
  getCustomer(): Promise<Customer>
  updateCustomer(patch: Partial<Omit<Customer, 'id' | 'memberSince'>>): Promise<Customer>
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>

  listSubscriptions(): Promise<Subscription[]>
  performSubscriptionAction(id: string, action: SubscriptionAction): Promise<Subscription>

  listInvoices(): Promise<Invoice[]>
  listPayments(): Promise<Payment[]>

  listNotifications(): Promise<AppNotification[]>
  markAllNotificationsRead(): Promise<AppNotification[]>

  listSupportRequests(): Promise<SupportRequest[]>
  createSupportRequest(input: { subject: string; topic: string; message: string }): Promise<SupportRequest>

  // ----- Back office (role: staff or admin) -----
  getBackofficeSummary(): Promise<BackofficeSummary>
  listCustomers(): Promise<BackofficeCustomer[]>
  listTickets(): Promise<Ticket[]>
  updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket>

  // ----- Admin only (role: admin) -----
  listTeam(): Promise<TeamMember[]>
  setTeamMemberActive(id: string, active: boolean): Promise<TeamMember>
  listPlans(): Promise<PlanConfig[]>
  updatePlanPermissions(id: string, patch: Partial<SubscriptionPermissions>): Promise<PlanConfig>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
