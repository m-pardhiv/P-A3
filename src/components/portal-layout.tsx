import { CreditCard, FileText, Layers, LayoutDashboard, Tags, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SessionUser } from '~/server/session'
import { AppShell, type NavGroup } from './shell/shell'

const groups: NavGroup[] = [
  {
    items: [
      { label: 'Overview', to: '/portal', icon: LayoutDashboard, exact: true },
      { label: 'My Subscriptions', to: '/portal/subscriptions', icon: Layers },
      { label: 'Invoices', to: '/portal/invoices', icon: FileText },
      { label: 'Payment History', to: '/portal/payments', icon: CreditCard },
      { label: 'Plans', to: '/portal/plans', icon: Tags },
      { label: 'My Account', to: '/portal/profile', icon: UserRound },
    ],
  },
]

/** The customer portal: the same frame as the console, with the customer's own pages. */
export function PortalLayout({ user, children }: { user: SessionUser; children: ReactNode }) {
  return (
    <AppShell user={user} groups={groups} home="/portal" account="/portal/profile">
      {children}
    </AppShell>
  )
}
