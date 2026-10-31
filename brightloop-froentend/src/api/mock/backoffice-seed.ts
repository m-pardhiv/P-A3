import { invoiceSummary, subscriptionPricing } from '@/lib/billing'
import { addDays, addMonths, formatMonth, startOfToday, toISODate } from '@/lib/format'
import type { BackofficeCustomer, PlanConfig, TeamMember, Ticket } from '@/types'
import { seed } from './seed'

/** Sample data for the staff and admin consoles. Dates are relative to today. */

const today = startOfToday()
const ago = (days: number) => toISODate(addDays(today, -days))

const monthsPerCycle = { monthly: 1, quarterly: 3, yearly: 12 } as const

// Maya's row is computed from her real sample data so the consoles agree with the customer portal.
const mayaMrr =
  Math.round(
    seed.subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + subscriptionPricing(s).total / monthsPerCycle[s.billingCycle], 0) * 100,
  ) / 100
const mayaOutstanding = seed.invoices.reduce((sum, inv) => sum + invoiceSummary(inv).outstanding, 0)

const customers: BackofficeCustomer[] = [
  {
    id: seed.customer.id,
    name: seed.customer.fullName,
    company: seed.customer.companyName,
    email: seed.customer.email,
    status: 'overdue',
    activeSubscriptions: seed.subscriptions.filter((s) => s.status === 'active').length,
    mrr: mayaMrr,
    outstanding: Math.round(mayaOutstanding * 100) / 100,
    since: seed.customer.memberSince,
  },
  { id: 'cus_a1', name: 'Daniel Okafor', company: 'Northwind Studio', email: 'daniel@northwind.example', status: 'active', activeSubscriptions: 2, mrr: 412, outstanding: 0, since: ago(610) },
  { id: 'cus_a2', name: 'Aiko Tanaka', company: 'Kite Labs', email: 'aiko@kitelabs.example', status: 'active', activeSubscriptions: 4, mrr: 1180, outstanding: 0, since: ago(530) },
  { id: 'cus_a3', name: 'Lucas Meyer', company: 'Meyer & Sons', email: 'lucas@meyerandsons.example', status: 'overdue', activeSubscriptions: 1, mrr: 149, outstanding: 298, since: ago(380) },
  { id: 'cus_a4', name: 'Sofia Alvarez', company: 'Brightside Clinics', email: 'sofia@brightside.example', status: 'active', activeSubscriptions: 3, mrr: 760, outstanding: 0, since: ago(300) },
  { id: 'cus_a5', name: 'Noah Patel', company: 'Patel Logistics', email: 'noah@patellogistics.example', status: 'inactive', activeSubscriptions: 0, mrr: 0, outstanding: 0, since: ago(700) },
  { id: 'cus_a6', name: 'Emma Johansson', company: 'Fjord Analytics', email: 'emma@fjord.example', status: 'active', activeSubscriptions: 5, mrr: 2240, outstanding: 560, since: ago(240) },
  { id: 'cus_a7', name: 'Omar Haddad', company: 'Haddad Foods', email: 'omar@haddadfoods.example', status: 'overdue', activeSubscriptions: 2, mrr: 335, outstanding: 335, since: ago(160) },
]

const mayaTickets: Ticket[] = seed.supportRequests.map((r) => ({
  ...r,
  customerName: seed.customer.fullName,
  company: seed.customer.companyName,
  priority: 'normal',
}))

const tickets: Ticket[] = [
  { id: 'SR-1047', subject: 'Invoice shows wrong tax rate', topic: 'Billing', message: 'The tax on our last invoice looks higher than expected.', createdAt: ago(1), status: 'received', customerName: 'Lucas Meyer', company: 'Meyer & Sons', priority: 'high' },
  { id: 'SR-1046', subject: 'Add 3 seats to Studio', topic: 'Subscriptions', message: 'We hired three designers and need more seats.', createdAt: ago(2), status: 'in-progress', customerName: 'Aiko Tanaka', company: 'Kite Labs', priority: 'normal' },
  { id: 'SR-1044', subject: 'Webhook retries failing', topic: 'Technical', message: 'Our endpoint returns 200 but retries keep firing.', createdAt: ago(4), status: 'in-progress', customerName: 'Emma Johansson', company: 'Fjord Analytics', priority: 'high' },
  { id: 'SR-1041', subject: 'Question about annual billing', topic: 'Billing', message: 'Can we switch Workflows from monthly to annual?', createdAt: ago(8), status: 'received', customerName: 'Sofia Alvarez', company: 'Brightside Clinics', priority: 'low' },
  { id: 'SR-1039', subject: 'Cancel my Forms plan', topic: 'Subscriptions', message: 'We no longer need Forms.', createdAt: ago(12), status: 'resolved', customerName: 'Noah Patel', company: 'Patel Logistics', priority: 'normal' },
  ...mayaTickets,
]

const team: TeamMember[] = [
  { id: 'usr_admin1', name: 'Priya Nair', email: 'admin@brightloop.example', role: 'admin', active: true, lastActive: ago(0) },
  { id: 'usr_staff1', name: 'Sam Rivera', email: 'staff@brightloop.example', role: 'staff', active: true, lastActive: ago(0) },
  { id: 'usr_staff2', name: 'Jordan Lee', email: 'jordan@brightloop.example', role: 'staff', active: true, lastActive: ago(2) },
  { id: 'usr_staff3', name: 'Mei Tan', email: 'mei@brightloop.example', role: 'staff', active: false, lastActive: ago(61) },
]

const subscriberCounts: Record<string, number> = { analytics: 214, workflows: 96, api: 41, studio: 133, forms: 58, support: 67 }

const plans: PlanConfig[] = seed.subscriptions.map((s) => ({
  id: s.productIcon,
  productName: s.productName,
  planName: s.planName,
  billingCycle: s.billingCycle,
  price: s.unitPrice,
  subscribers: subscriberCounts[s.productIcon] ?? 10,
  permissions: { ...s.permissions },
}))

const mrr = Math.round(customers.reduce((sum, c) => sum + c.mrr, 0) * 100) / 100
const growth = [0.72, 0.78, 0.84, 0.89, 0.95, 1]
const revenueByMonth = growth.map((g, i) => ({
  month: formatMonth(addMonths(new Date(today.getFullYear(), today.getMonth(), 1), i - (growth.length - 1))),
  amount: Math.round(mrr * g),
}))

export const backofficeSeed = { customers, tickets, team, plans, mrr, revenueByMonth }
