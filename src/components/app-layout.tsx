import {
  BadgePercent,
  CalendarClock,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Package,
  Percent,
  Play,
  ReceiptText,
  Repeat,
  Tags,
  UserCog,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { SessionUser } from '~/server/session'
import { AppShell, type NavGroup } from './shell/shell'

const groups: (NavGroup & { adminOnly?: boolean })[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Subscriptions', to: '/subscriptions', icon: Repeat },
      { label: 'Invoices', to: '/invoices', icon: ReceiptText },
      { label: 'Payments', to: '/payments', icon: CircleDollarSign },
      { label: 'Billing', to: '/billing', icon: Play },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Products', to: '/products', icon: Package },
      { label: 'Plans', to: '/plans', icon: Tags },
      { label: 'Quotation Templates', to: '/quotation-templates', icon: FileText },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { label: 'Discounts', to: '/discounts', icon: BadgePercent },
      { label: 'Taxes', to: '/taxes', icon: Percent },
      { label: 'Payment Terms', to: '/payment-terms', icon: CalendarClock },
      { label: 'Team', to: '/staff', icon: UserCog },
    ],
  },
]

/** The admin and staff console. Staff do not see the administration group. */
export function AppLayout({ user, children }: { user: SessionUser; children: ReactNode }) {
  const visible = groups.filter((group) => !group.adminOnly || user.role === 'admin')
  return (
    <AppShell user={user} groups={visible} home="/dashboard">
      {children}
    </AppShell>
  )
}
