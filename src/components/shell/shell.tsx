import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useQueryClient } from '@tanstack/react-query'
import { Link, type LinkProps, useRouter, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  type LucideIcon,
  Menu,
  UserRound,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Avatar } from '~/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Tooltip, TooltipProvider } from '~/components/ui/tooltip'
import { greetingForNow } from '~/lib/format'
import { pageTransition } from '~/lib/motion'
import { cn } from '~/lib/utils'
import { logout } from '~/server/functions/auth'
import type { SessionUser } from '~/server/session'
import { Logo, LogoMark } from './logo'

export type NavItem = {
  label: string
  to: LinkProps['to']
  icon: LucideIcon
  /** Highlight only on this exact address, not on everything below it. */
  exact?: boolean
}
export type NavGroup = { label?: string; items: NavItem[] }

const STORAGE_KEY = 'brightloop.sidebar-collapsed'
const SIDEBAR_EXPANDED = 268
const SIDEBAR_COLLAPSED = 84

const roleLabel = { admin: 'Admin console', staff: 'Staff console', customer: '' } as const

export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await logout()
    queryClient.clear()
    await router.navigate({ to: '/' })
  }
}

function SidebarNav(props: {
  user: SessionUser
  groups: NavGroup[]
  collapsed: boolean
  indicatorId: string
  onNavigate?: () => void
}) {
  const { user, groups, collapsed, indicatorId, onNavigate } = props
  const signOut = useSignOut()

  const label = (text: string) => (
    <motion.span
      initial={false}
      animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden whitespace-nowrap"
    >
      {text}
    </motion.span>
  )

  return (
    <>
      {user.role !== 'customer' && !collapsed && (
        <p className="mx-3 mb-3 rounded-xl bg-foreground px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-background">
          {roleLabel[user.role]}
        </p>
      )}
      <nav
        aria-label="Main"
        className="thin-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3"
      >
        {groups.map((group, index) => (
          <div key={group.label ?? index} className="flex flex-col gap-1">
            {group.label ? (
              collapsed ? (
                <hr className="mx-3 my-2 border-border" />
              ) : (
                <p className="mt-3 px-3.5 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                  {group.label}
                </p>
              )
            ) : null}
            {group.items.map(({ to, label: text, icon: Icon, exact }) => {
              const link = (
                <Link
                  key={String(to)}
                  to={to}
                  activeOptions={{ exact: exact ?? false }}
                  onClick={onNavigate}
                  aria-label={collapsed ? text : undefined}
                  className={cn(
                    'group relative flex h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors',
                    collapsed && 'justify-center gap-0 px-0',
                  )}
                >
                  {({ isActive }: { isActive: boolean }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId={indicatorId}
                          className="absolute inset-0 rounded-xl bg-accent ring-1 ring-brand-200/70"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId={`${indicatorId}-bar`}
                          className="absolute -left-3 top-2.5 h-6 w-1 rounded-r-full bg-brand-gradient"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          'relative size-[19px] shrink-0',
                          isActive
                            ? 'text-accent-foreground'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                        strokeWidth={isActive ? 2.3 : 2}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          'relative',
                          isActive
                            ? 'text-accent-foreground'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      >
                        {label(text)}
                      </span>
                    </>
                  )}
                </Link>
              )
              return collapsed ? (
                <Tooltip key={String(to)} content={text} side="right">
                  {link}
                </Tooltip>
              ) : (
                link
              )
            })}
          </div>
        ))}
      </nav>

      <div className="mt-4 flex flex-col gap-3 px-3 pb-4">
        {(() => {
          const button = (
            <button
              type="button"
              onClick={() => {
                onNavigate?.()
                void signOut()
              }}
              aria-label={collapsed ? 'Log out' : undefined}
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger',
                collapsed && 'justify-center gap-0 px-0',
              )}
            >
              <LogOut className="size-[19px] shrink-0" aria-hidden />
              {label('Logout')}
            </button>
          )
          return collapsed ? (
            <Tooltip content="Logout" side="right">
              {button}
            </Tooltip>
          ) : (
            button
          )
        })()}
      </div>
    </>
  )
}

function DesktopSidebar(props: {
  user: SessionUser
  groups: NavGroup[]
  collapsed: boolean
  onToggle: () => void
  home: LinkProps['to']
}) {
  const { collapsed, onToggle, home } = props
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/80 bg-card py-5 md:flex print:hidden"
    >
      <div className={cn('mb-7 flex h-10 items-center px-6', collapsed && 'justify-center px-0')}>
        <Link to={home} aria-label="Brightloop home" className="rounded-xl">
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
      </div>
      <SidebarNav
        user={props.user}
        groups={props.groups}
        collapsed={collapsed}
        indicatorId="nav-active-desktop"
      />
      <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="absolute -right-3.5 top-[26px] grid size-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
        >
          {collapsed ? (
            <ChevronsRight className="size-3.5" />
          ) : (
            <ChevronsLeft className="size-3.5" />
          )}
        </button>
      </Tooltip>
    </motion.aside>
  )
}

function MobileDrawer(props: {
  user: SessionUser
  groups: NavGroup[]
  open: boolean
  onOpenChange: (open: boolean) => void
  home: LinkProps['to']
}) {
  const { open, onOpenChange, home } = props
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 flex w-[18.5rem] max-w-[85vw] flex-col bg-card py-5 shadow-lift focus:outline-none md:hidden"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
                <div className="mb-7 flex h-10 items-center justify-between px-6">
                  <Link to={home} aria-label="Brightloop home" onClick={() => onOpenChange(false)}>
                    <Logo />
                  </Link>
                  <DialogPrimitive.Close
                    aria-label="Close menu"
                    className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>
                <SidebarNav
                  user={props.user}
                  groups={props.groups}
                  collapsed={false}
                  indicatorId="nav-active-mobile"
                  onNavigate={() => onOpenChange(false)}
                />
              </motion.aside>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

export function ProfileMenu(props: {
  user: SessionUser
  account?: LinkProps['to']
  /** Show only the avatar. */
  compact?: boolean
}) {
  const { user, account, compact } = props
  const signOut = useSignOut()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex h-11 items-center gap-2.5 rounded-full border border-border/80 bg-card py-1 pl-1 pr-3 shadow-soft transition-colors hover:bg-secondary/60 sm:pr-3.5"
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar name={user.name} className="size-9 text-sm" />
          {compact ? null : (
            <span className="hidden text-left leading-tight sm:block">
              <span
                className="block text-[11px] font-medium text-muted-foreground"
                suppressHydrationWarning
              >
                {greetingForNow()},
              </span>
              <span className="block text-[13px] font-bold">{user.name}</span>
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="pb-2">
          <span className="block text-sm font-bold text-foreground">{user.name}</span>
          <span className="block truncate font-medium">{user.email}</span>
          {user.role !== 'customer' && (
            <span className="mt-1.5 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold capitalize text-accent-foreground">
              {user.role}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {account && (
          <DropdownMenuItem asChild>
            <Link to={account}>
              <UserRound /> My account
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={() => void signOut()}>
          <LogOut /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background"
    >
      Skip to content
    </a>
  )
}

/**
 * The frame for the admin and staff console: a collapsible sidebar, a drawer on phones, and a top
 * bar with the account menu. Customers get the lighter frame in `portal-layout.tsx`.
 */
export function AppShell(props: {
  user: SessionUser
  groups: NavGroup[]
  /** Where the logo links to. */
  home: LinkProps['to']
  children: ReactNode
}) {
  const { user, groups, home, children } = props
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Read the saved choice after the first render, so the server and browser markup match.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setCollapsed(stored === '1')
      else setCollapsed(window.matchMedia('(max-width: 1023px)').matches)
    } catch {
      /* storage unavailable: keep the default */
    }
  }, [])

  const toggle = () =>
    setCollapsed((current) => {
      try {
        localStorage.setItem(STORAGE_KEY, current ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !current
    })

  return (
    <TooltipProvider>
      <SkipLink />
      <div className="flex min-h-screen">
        <DesktopSidebar
          user={user}
          groups={groups}
          collapsed={collapsed}
          onToggle={toggle}
          home={home}
        />
        <MobileDrawer
          user={user}
          groups={groups}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          home={home}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
            <div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-border/80 bg-card shadow-soft md:hidden"
              >
                <Menu className="size-5" />
              </button>
              <div className="ml-auto">
                <ProfileMenu user={user} />
              </div>
            </div>
          </header>
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 px-4 pb-16 pt-2 focus:outline-none sm:px-6 lg:px-10"
          >
            <div className="mx-auto w-full max-w-[1240px]">
              <motion.div key={pathname} {...pageTransition}>
                {children}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
