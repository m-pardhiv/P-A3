/** Domain types for the customer portal. All amounts are in the major currency unit (e.g. dollars). */

export type SubscriptionStatus = 'active' | 'pending' | 'paused' | 'closed'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'
export type ProductIconKey = 'analytics' | 'workflows' | 'api' | 'studio' | 'forms' | 'support'

/** Which self-service actions the plan configuration allows for a subscription. */
export interface SubscriptionPermissions {
  canPause: boolean
  canResume: boolean
  canRenew: boolean
  canCancel: boolean
}

export type SubscriptionAction = 'pause' | 'resume' | 'renew' | 'cancel'

export type TimelineKind =
  | 'created'
  | 'activated'
  | 'invoice'
  | 'payment'
  | 'paused'
  | 'resumed'
  | 'renewed'
  | 'cancelled'
  | 'closed'
  | 'upcoming'

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description?: string
  kind: TimelineKind
}

export interface Subscription {
  id: string
  productName: string
  productIcon: ProductIconKey
  productDescription: string
  features: string[]
  planName: string
  status: SubscriptionStatus
  billingCycle: BillingCycle
  /** Start of the current subscription term (ISO date). */
  startDate: string
  /** End of the current term / renewal date (ISO date). */
  expiryDate: string
  quantity: number
  quantityLabel: string
  unitPrice: number
  /** Tax rate as a fraction, e.g. 0.0825. */
  taxRate: number
  discount?: { label: string; percent: number }
  currency: string
  permissions: SubscriptionPermissions
  timeline: TimelineEvent[]
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'

export interface InvoiceLineItem {
  id: string
  description: string
  detail?: string
  quantity: number
  unitPrice: number
  taxRate: number
  discountPercent: number
  discountLabel?: string
}

export interface Invoice {
  id: string
  number: string
  subscriptionId: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  /** Amount already received against this invoice. */
  paidAmount: number
  currency: string
  lineItems: InvoiceLineItem[]
  notes?: string
}

export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded'
export type PaymentMethodType = 'card' | 'bank'

export interface Payment {
  id: string
  reference: string
  invoiceId: string
  invoiceNumber: string
  methodType: PaymentMethodType
  methodLabel: string
  date: string
  amount: number
  currency: string
  status: PaymentStatus
  failureReason?: string
}

export interface BillingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface Customer {
  id: string
  fullName: string
  email: string
  phone: string
  companyName: string
  jobTitle?: string
  memberSince: string
  billingAddress: BillingAddress
  billingEmail: string
  taxIdType: string
  taxId: string
}

export type NotificationKind = 'invoice' | 'payment' | 'renewal' | 'product'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: string
  read: boolean
  href?: string
}

export interface SupportRequest {
  id: string
  subject: string
  topic: string
  message: string
  createdAt: string
  status: 'received' | 'in-progress' | 'resolved'
}

/* ---------- Roles & back office ---------- */

export type Role = 'customer' | 'staff' | 'admin'

export interface SessionUser {
  id: string
  role: Role
  name: string
  email: string
}

export type TicketStatus = SupportRequest['status']

export interface Ticket extends SupportRequest {
  customerName: string
  company: string
  priority: 'low' | 'normal' | 'high'
}

export interface BackofficeCustomer {
  id: string
  name: string
  company: string
  email: string
  status: 'active' | 'overdue' | 'inactive'
  activeSubscriptions: number
  /** Monthly recurring revenue. */
  mrr: number
  outstanding: number
  since: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  active: boolean
  lastActive: string
}

export interface PlanConfig {
  id: string
  productName: string
  planName: string
  billingCycle: BillingCycle
  price: number
  subscribers: number
  permissions: SubscriptionPermissions
}

export interface BackofficeSummary {
  mrr: number
  activeSubscriptions: number
  customers: number
  overdueAccounts: number
  openTickets: number
  revenueByMonth: { month: string; amount: number }[]
}
