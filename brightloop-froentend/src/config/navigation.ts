import {
  CreditCard,
  FileText,
  Inbox,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  SlidersHorizontal,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const customerNav: NavItem[] = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/subscriptions', label: 'My Subscriptions', icon: Layers },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/payments', label: 'Payment History', icon: CreditCard },
  { to: '/account', label: 'My Account', icon: UserRound },
  { to: '/support', label: 'Help & Support', icon: LifeBuoy },
]

export const staffNav: NavItem[] = [
  { to: '/staff', label: 'Overview', icon: LayoutDashboard },
  { to: '/staff/customers', label: 'Customers', icon: Users },
  { to: '/staff/tickets', label: 'Support tickets', icon: Inbox },
]

export const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/tickets', label: 'Support tickets', icon: Inbox },
  { to: '/admin/plans', label: 'Plans', icon: SlidersHorizontal },
  { to: '/admin/team', label: 'Team', icon: UsersRound },
]

export const navFor = (role: Role): NavItem[] => (role === 'admin' ? adminNav : role === 'staff' ? staffNav : customerNav)

/** Where each role lands after logging in. */
export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/overview')

/** Whether a path belongs to the area a role is allowed to use. */
export function canAccessPath(role: Role, path: string) {
  if (path.startsWith('/admin')) return role === 'admin'
  if (path.startsWith('/staff')) return role === 'staff'
  return role === 'customer'
}

export const roleLabel: Record<Role, string> = { customer: 'Customer', staff: 'Staff console', admin: 'Admin console' }

export interface Crumb {
  label: string
  to?: string
}

export interface PageMeta {
  title: string
  crumbs: Crumb[]
}

const root: Crumb = { label: 'Portal', to: '/overview' }

const backofficeTitles: Record<string, string> = {
  customers: 'Customers',
  tickets: 'Support tickets',
  plans: 'Plans',
  team: 'Team',
}

function getBackofficeMeta(section: 'staff' | 'admin', page?: string): PageMeta {
  const home: Crumb = { label: roleLabel[section === 'admin' ? 'admin' : 'staff'], to: `/${section}` }
  const title = page ? (backofficeTitles[page] ?? 'Page not found') : 'Overview'
  return { title, crumbs: [home, { label: title }] }
}

/** Resolve the topbar title + breadcrumb for a pathname. `invoiceNumber` resolves invoice ids to readable numbers. */
export function getPageMeta(pathname: string, resolve: { invoiceNumber?: (id: string) => string | undefined } = {}): PageMeta {
  const [, section, id] = pathname.split('/')
  switch (section) {
    case 'staff':
    case 'admin':
      return getBackofficeMeta(section, id)
    case 'overview':
      return { title: 'Overview', crumbs: [root, { label: 'Overview' }] }
    case 'subscriptions':
      return id
        ? { title: 'Subscription details', crumbs: [root, { label: 'My Subscriptions', to: '/subscriptions' }, { label: id }] }
        : { title: 'My Subscriptions', crumbs: [root, { label: 'My Subscriptions' }] }
    case 'invoices':
      return id
        ? {
            title: 'Invoice details',
            crumbs: [root, { label: 'Invoices', to: '/invoices' }, { label: resolve.invoiceNumber?.(id) ?? 'Invoice' }],
          }
        : { title: 'Invoices', crumbs: [root, { label: 'Invoices' }] }
    case 'payments':
      return { title: 'Payment History', crumbs: [root, { label: 'Payment History' }] }
    case 'account':
      return { title: 'My Account', crumbs: [root, { label: 'My Account' }] }
    case 'support':
      return { title: 'Help & Support', crumbs: [root, { label: 'Help & Support' }] }
    default:
      return { title: 'Page not found', crumbs: [root, { label: 'Not found' }] }
  }
}
