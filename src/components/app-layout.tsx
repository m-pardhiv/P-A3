import { useQueryClient } from '@tanstack/react-query'
import { Link, type LinkProps, useLocation, useRouter } from '@tanstack/react-router'
import {
  BadgePercent,
  CalendarClock,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  Package,
  Percent,
  Play,
  ReceiptText,
  Repeat,
  ScrollText,
  Tags,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { logout } from '~/server/functions/auth'
import type { SessionUser } from '~/server/session'

type NavItem = { label: string; to: LinkProps['to']; icon: LucideIcon }
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean }

const navGroups: NavGroup[] = [
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
      { label: 'Staff', to: '/staff', icon: UserCog },
    ],
  },
]

export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await logout()
    queryClient.clear()
    await router.navigate({ to: '/login' })
  }
}

export function BrandMark() {
  return (
    <span className="flex items-center gap-2 font-display text-xl font-semibold text-white">
      <ScrollText size={20} className="text-marigold" aria-hidden />
      Brightloop
    </span>
  )
}

export function AppLayout({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = useLocation({ select: (location) => location.pathname })
  const signOut = useSignOut()

  // biome-ignore lint/correctness/useExhaustiveDependencies: closes the drawer on every navigation.
  useEffect(() => setDrawerOpen(false), [pathname])

  const groups = navGroups.filter((group) => !group.adminOnly || user.role === 'admin')

  return (
    <div className="min-h-dvh lg:flex">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <BrandMark />
        <button
          type="button"
          className="text-white"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu aria-hidden />
        </button>
      </div>

      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-ink/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <BrandMark />
          <button
            type="button"
            className="text-white lg:hidden"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          >
            <X aria-hidden />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto pb-4 pl-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <h2 className="mb-1 px-3 font-sans text-sm tracking-normal text-ink-text/70">
                {group.label}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="nav-tab">
                      <item.icon size={18} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-ink-line px-5 py-4 text-sm">
          <p className="truncate font-medium text-white">{user.name}</p>
          <p className="mb-2 text-ink-text capitalize">{user.role}</p>
          <button type="button" className="text-ink-text underline" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
