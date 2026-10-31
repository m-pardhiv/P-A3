import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CreditCard, FileText, House, Layers, Menu, Tags } from 'lucide-react'
import type { ReactNode } from 'react'
import { pageTransition } from '~/lib/motion'
import type { SessionUser } from '~/server/session'
import { SiteFooter } from './landing/site-footer'
import { Logo } from './shell/logo'
import { type NavItem, ProfileMenu, SkipLink } from './shell/shell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const links: NavItem[] = [
  { label: 'Home', to: '/portal', icon: House, exact: true },
  { label: 'Subscriptions', to: '/portal/subscriptions', icon: Layers },
  { label: 'Invoices', to: '/portal/invoices', icon: FileText },
  { label: 'Payments', to: '/portal/payments', icon: CreditCard },
  { label: 'Plans', to: '/portal/plans', icon: Tags },
]

function NavButtons() {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {links.map(({ label, to, exact }) => (
        <Link
          key={String(to)}
          to={to}
          activeOptions={{ exact: exact ?? false }}
          className="rounded-full px-4 py-2 text-[15px] font-semibold text-foreground/70 transition-colors hover:bg-secondary/70 hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

/** The same buttons, folded into a menu where they no longer fit on one line. */
function NavMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className="grid size-11 place-items-center rounded-full border border-border/80 bg-card shadow-soft transition-colors hover:bg-secondary/60 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {links.map(({ label, to, icon: Icon, exact }) => (
          <DropdownMenuItem key={String(to)} asChild>
            <Link
              to={to}
              activeOptions={{ exact: exact ?? false }}
              className="data-[status=active]:bg-accent data-[status=active]:font-bold data-[status=active]:text-accent-foreground"
            >
              <Icon /> {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The customer portal: the public home page's white page and top bar, with the customer's pages. */
export function PortalLayout({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SkipLink />
      <header className="no-print sticky top-0 z-30 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[74rem] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link to="/portal" aria-label="Brightloop home">
              <Logo />
            </Link>
            <NavButtons />
          </div>
          <div className="flex items-center gap-2">
            <NavMenu />
            <ProfileMenu user={user} account="/portal/profile" compact />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="w-full flex-1 focus:outline-none">
        {/* Home runs edge to edge for the moving cards, like the public home page. */}
        <motion.div
          key={pathname}
          {...pageTransition}
          className={
            pathname === '/portal' ? undefined : 'mx-auto max-w-[74rem] px-5 pb-16 pt-4 sm:px-8'
          }
        >
          {children}
        </motion.div>
      </main>
      <SiteFooter />
    </div>
  )
}
