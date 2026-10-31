import { documentTotals } from '@/lib/billing'
import { addDays, startOfToday, toISODate } from '@/lib/format'
import type {
  AppNotification,
  Customer,
  Invoice,
  Payment,
  Subscription,
  SupportRequest,
  TimelineEvent,
} from '@/types'

/**
 * Realistic sample data for the signed-in customer. Every date is generated relative to
 * "today" so the portal always looks live (renewals upcoming, invoices recently issued).
 */

const today = startOfToday()
const ago = (days: number) => toISODate(addDays(today, -days))
const ahead = (days: number) => toISODate(addDays(today, days))

const TAX = 0.08

function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

const customer: Customer = {
  id: 'cus_7Hq2Lm',
  fullName: 'Maya Chen',
  email: 'maya.chen@lumenandco.com',
  phone: '+1 (415) 555-0142',
  companyName: 'Lumen & Co.',
  jobTitle: 'Head of Operations',
  memberSince: ago(420),
  billingAddress: {
    line1: '1280 Market Street',
    line2: 'Suite 400',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'United States',
  },
  billingEmail: 'accounts@lumenandco.com',
  taxIdType: 'EIN',
  taxId: '84-2917365',
}

const ev = (
  id: string,
  date: string,
  kind: TimelineEvent['kind'],
  title: string,
  description?: string,
): TimelineEvent => ({ id, date, kind, title, description })

const subscriptions: Subscription[] = [
  {
    id: 'BL-SUB-20418',
    productName: 'Brightloop Analytics',
    productIcon: 'analytics',
    productDescription:
      'Product analytics and dashboards for teams that want answers without writing queries.',
    features: ['Unlimited dashboards', 'Funnels, cohorts & retention', 'Scheduled email reports', 'SSO & audit log'],
    planName: 'Pro · Growth',
    status: 'active',
    billingCycle: 'monthly',
    startDate: ago(347),
    expiryDate: ahead(18),
    quantity: 12,
    quantityLabel: 'seats',
    unitPrice: 29,
    taxRate: TAX,
    discount: { label: 'Loyalty discount', percent: 10 },
    currency: 'USD',
    permissions: { canPause: true, canResume: true, canRenew: true, canCancel: true },
    timeline: [
      ev('t1', ago(347), 'created', 'Subscription created', 'Pro · Growth plan, 8 seats'),
      ev('t2', ago(346), 'activated', 'Subscription activated', 'First payment received'),
      ev('t3', ago(210), 'renewed', 'Seats increased', 'Seats changed from 8 to 12'),
      ev('t4', ago(5), 'invoice', 'Invoice issued', 'Monthly invoice for the current period'),
      ev('t5', ahead(18), 'upcoming', 'Renewal due', 'Term ends and renews on this date'),
    ],
  },
  {
    id: 'BL-SUB-20733',
    productName: 'Brightloop Workflows',
    productIcon: 'workflows',
    productDescription: 'Automate approvals, hand-offs and recurring tasks across your whole team.',
    features: ['500 automations / month', 'Approval chains', 'Slack & email triggers', 'Priority execution'],
    planName: 'Business · Annual',
    status: 'active',
    billingCycle: 'yearly',
    startDate: ago(120),
    expiryDate: ahead(245),
    quantity: 1,
    quantityLabel: 'workspace',
    unitPrice: 1490,
    taxRate: TAX,
    currency: 'USD',
    // Annual contract: cannot be paused, but can be renewed early or cancelled at term end.
    permissions: { canPause: false, canResume: false, canRenew: true, canCancel: true },
    timeline: [
      ev('t1', ago(121), 'created', 'Subscription created', 'Business · Annual plan'),
      ev('t2', ago(120), 'activated', 'Subscription activated', 'Annual invoice paid by bank transfer'),
      ev('t3', ahead(245), 'upcoming', 'Renewal due'),
    ],
  },
  {
    id: 'BL-SUB-21002',
    productName: 'Brightloop Insights API',
    productIcon: 'api',
    productDescription: 'Programmatic access to your metrics, events and exports with predictable limits.',
    features: ['5M API calls / month', 'Webhooks', 'Sandbox environment', '99.9% uptime SLA'],
    planName: 'Scale',
    status: 'pending',
    billingCycle: 'monthly',
    startDate: ahead(3),
    expiryDate: ahead(368),
    quantity: 1,
    quantityLabel: 'environment',
    unitPrice: 249,
    taxRate: TAX,
    currency: 'USD',
    permissions: { canPause: false, canResume: false, canRenew: false, canCancel: true },
    timeline: [
      ev('t1', ago(2), 'created', 'Subscription ordered', 'Awaiting activation on the start date'),
      ev('t2', ahead(3), 'upcoming', 'Scheduled start'),
    ],
  },
  {
    id: 'BL-SUB-19876',
    productName: 'Brightloop Studio',
    productIcon: 'studio',
    productDescription: 'Brand-safe templates and a shared asset library for your creative team.',
    features: ['Shared asset library', 'Brand kits', 'Commenting & approvals', '50 GB storage'],
    planName: 'Team',
    status: 'paused',
    billingCycle: 'monthly',
    startDate: ago(200),
    expiryDate: ahead(165),
    quantity: 4,
    quantityLabel: 'seats',
    unitPrice: 19,
    taxRate: TAX,
    currency: 'USD',
    permissions: { canPause: true, canResume: true, canRenew: false, canCancel: true },
    timeline: [
      ev('t1', ago(200), 'created', 'Subscription created', 'Team plan, 4 seats'),
      ev('t2', ago(199), 'activated', 'Subscription activated'),
      ev('t3', ago(100), 'paused', 'Subscription paused', 'Billing stopped at your request'),
    ],
  },
  {
    id: 'BL-SUB-18204',
    productName: 'Brightloop Forms',
    productIcon: 'forms',
    productDescription: 'Simple forms and surveys with branching logic and instant responses.',
    features: ['Unlimited forms', 'Conditional logic', 'CSV export'],
    planName: 'Starter',
    status: 'closed',
    billingCycle: 'monthly',
    startDate: ago(400),
    expiryDate: ago(35),
    quantity: 1,
    quantityLabel: 'workspace',
    unitPrice: 15,
    taxRate: TAX,
    currency: 'USD',
    permissions: { canPause: false, canResume: false, canRenew: true, canCancel: false },
    timeline: [
      ev('t1', ago(400), 'created', 'Subscription created', 'Starter plan'),
      ev('t2', ago(399), 'activated', 'Subscription activated'),
      ev('t3', ago(35), 'closed', 'Subscription ended', 'The term expired without renewal'),
    ],
  },
  {
    id: 'BL-SUB-20591',
    productName: 'Brightloop Priority Support',
    productIcon: 'support',
    productDescription: 'Named support engineer, 1-hour response times and quarterly health reviews.',
    features: ['1-hour response SLA', 'Named support engineer', 'Quarterly health review'],
    planName: 'Priority add-on',
    status: 'active',
    billingCycle: 'quarterly',
    startDate: ago(323),
    expiryDate: ahead(42),
    quantity: 1,
    quantityLabel: 'account',
    unitPrice: 180,
    taxRate: TAX,
    currency: 'USD',
    // Cancellation is handled through the account manager for this add-on.
    permissions: { canPause: true, canResume: true, canRenew: true, canCancel: false },
    timeline: [
      ev('t1', ago(323), 'created', 'Subscription created', 'Priority add-on'),
      ev('t2', ago(322), 'activated', 'Subscription activated'),
      ev('t3', ahead(42), 'upcoming', 'Renewal due'),
    ],
  },
]

const sub = (id: string) => subscriptions.find((s) => s.id === id)!

interface InvoiceSpec {
  sub: string
  issued: number // days ago (negative = future)
  status: Invoice['status']
  paid?: number
  period: string
}

const monthLabel = (daysAgo: number) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(addDays(today, -daysAgo))

const specs: InvoiceSpec[] = [
  { sub: 'BL-SUB-20418', issued: 155, status: 'paid', period: monthLabel(155) },
  { sub: 'BL-SUB-20418', issued: 125, status: 'paid', period: monthLabel(125) },
  { sub: 'BL-SUB-20418', issued: 95, status: 'paid', period: monthLabel(95) },
  { sub: 'BL-SUB-20418', issued: 65, status: 'paid', period: monthLabel(65) },
  { sub: 'BL-SUB-20418', issued: 35, status: 'paid', period: monthLabel(35) },
  { sub: 'BL-SUB-20418', issued: 5, status: 'pending', paid: 100, period: monthLabel(5) },
  { sub: 'BL-SUB-20733', issued: 120, status: 'paid', period: 'Annual term' },
  { sub: 'BL-SUB-20591', issued: 130, status: 'paid', period: 'Quarterly term' },
  { sub: 'BL-SUB-20591', issued: 40, status: 'overdue', period: 'Quarterly term' },
  { sub: 'BL-SUB-19876', issued: 175, status: 'paid', period: monthLabel(175) },
  { sub: 'BL-SUB-19876', issued: 145, status: 'paid', period: monthLabel(145) },
  { sub: 'BL-SUB-19876', issued: 115, status: 'paid', period: monthLabel(115) },
  { sub: 'BL-SUB-18204', issued: 250, status: 'paid', period: monthLabel(250) },
  { sub: 'BL-SUB-18204', issued: 220, status: 'paid', period: monthLabel(220) },
  { sub: 'BL-SUB-21002', issued: -3, status: 'draft', period: 'First month' },
]

const invoices: Invoice[] = specs
  .slice()
  .sort((a, b) => b.issued - a.issued)
  .map((spec, index) => {
    const s = sub(spec.sub)
    const base: Omit<Invoice, 'paidAmount'> = {
      id: `inv_${hash(spec.sub + spec.issued)}`,
      number: `INV-${addDays(today, -spec.issued).getFullYear()}-${String(1042 + index).padStart(4, '0')}`,
      subscriptionId: s.id,
      issueDate: ago(spec.issued),
      dueDate: toISODate(addDays(addDays(today, -spec.issued), spec.sub === 'BL-SUB-20733' ? 30 : 14)),
      status: spec.status,
      currency: s.currency,
      lineItems: [
        {
          id: 'li1',
          description: `${s.productName} — ${s.planName}`,
          detail: spec.period,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          taxRate: s.taxRate,
          discountPercent: (s.discount?.percent ?? 0) / 100,
          discountLabel: s.discount?.label,
        },
      ],
    }
    const total = documentTotals(base.lineItems).total
    const paidAmount = spec.status === 'paid' ? total : (spec.paid ?? 0)
    return { ...base, paidAmount }
  })
  // Newest first
  .sort((a, b) => b.issueDate.localeCompare(a.issueDate))

const payments: Payment[] = []

function addPayment(
  invoice: Invoice,
  offsetDays: number,
  amount: number,
  status: Payment['status'],
  methodType: Payment['methodType'],
  methodLabel: string,
  failureReason?: string,
) {
  const date = toISODate(addDays(new Date(invoice.issueDate + 'T00:00:00'), offsetDays))
  payments.push({
    id: `pay_${hash(invoice.number + offsetDays + status)}`,
    reference: `TXN-${hash(invoice.number + offsetDays + status)}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    methodType,
    methodLabel,
    date,
    amount,
    currency: invoice.currency,
    status,
    failureReason,
  })
}

for (const inv of invoices) {
  const total = documentTotals(inv.lineItems).total
  const isBank = inv.subscriptionId === 'BL-SUB-20733'
  if (inv.status === 'paid') {
    addPayment(inv, isBank ? 3 : 1, total, 'succeeded', isBank ? 'bank' : 'card', isBank ? 'ACH · Chase ••6021' : 'Visa •••• 4242')
  }
  if (inv.status === 'pending' && inv.paidAmount > 0) {
    addPayment(inv, 2, inv.paidAmount, 'succeeded', 'card', 'Visa •••• 4242')
    addPayment(inv, 4, Math.round((total - inv.paidAmount) * 100) / 100, 'pending', 'bank', 'ACH · Chase ••6021')
  }
  if (inv.status === 'overdue') {
    addPayment(inv, 3, total, 'failed', 'card', 'Mastercard •••• 8812', 'Card declined by issuer')
    addPayment(inv, 10, total, 'failed', 'card', 'Mastercard •••• 8812', 'Card expired')
  }
}

payments.sort((a, b) => b.date.localeCompare(a.date))

const notifications: AppNotification[] = [
  {
    id: 'n1',
    kind: 'invoice',
    title: 'Invoice overdue',
    body: `${invoices.find((i) => i.status === 'overdue')?.number} is past its due date.`,
    createdAt: ago(0),
    read: false,
    href: `/invoices/${invoices.find((i) => i.status === 'overdue')?.id}`,
  },
  {
    id: 'n2',
    kind: 'renewal',
    title: 'Renewal coming up',
    body: 'Brightloop Analytics renews in 18 days.',
    createdAt: ago(1),
    read: false,
    href: '/subscriptions/BL-SUB-20418',
  },
  {
    id: 'n3',
    kind: 'payment',
    title: 'Payment received',
    body: 'We received your $100.00 payment. Thank you!',
    createdAt: ago(3),
    read: true,
    href: '/payments',
  },
  {
    id: 'n4',
    kind: 'product',
    title: 'Insights API starts soon',
    body: 'Your Scale plan activates in 3 days.',
    createdAt: ago(2),
    read: true,
    href: '/subscriptions/BL-SUB-21002',
  },
]

const supportRequests: SupportRequest[] = [
  {
    id: 'SR-1048',
    subject: 'Update billing contact',
    topic: 'Billing',
    message: 'Please send invoices to accounts@lumenandco.com.',
    createdAt: ago(24),
    status: 'resolved',
  },
]

export const seed = { customer, subscriptions, invoices, payments, notifications, supportRequests }
