import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronsLeft, ChevronsRight, LogOut, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Tooltip } from '@/components/ui/tooltip'
import { homeFor, navFor, roleLabel } from '@/config/navigation'
import { usePortal } from '@/context/portal'
import { cn } from '@/lib/utils'
import { Logo, LogoMark } from './logo'

/** Brand mark that links to the person's home page: Overview for customers. */
function HomeLink({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const { session } = usePortal()
  return (
    <Link to={homeFor(session?.role ?? 'customer')} aria-label="Brightloop home" onClick={onClick} className="rounded-xl">
      {children}
    </Link>
  )
}

const SIDEBAR_EXPANDED = 268
const SIDEBAR_COLLAPSED = 84

function SidebarNav({
  collapsed,
  indicatorId,
  onNavigate,
}: {
  collapsed: boolean
  indicatorId: string
  onNavigate?: () => void
}) {
  const { signOut, session } = usePortal()
  const navigate = useNavigate()
  const role = session?.role ?? 'customer'
  const items = navFor(role)

  const handleLogout = () => {
    onNavigate?.()
    // Navigate first so the route guard doesn't bounce us to /login when the session ends.
    navigate('/', { replace: true })
    signOut()
  }

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
      {role !== 'customer' && !collapsed && (
        <p className="mx-3 mb-3 rounded-xl bg-foreground px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-background">
          {roleLabel[role]}
        </p>
      )}
      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3">
        {items.map(({ to, label: text, icon: Icon }) => {
          const link = (
            <NavLink
              key={to}
              to={to}
              end={to === '/staff' || to === '/admin'}
              onClick={onNavigate}
              aria-label={collapsed ? text : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors',
                  isActive ? 'text-accent-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                  collapsed && 'justify-center gap-0 px-0',
                )
              }
            >
              {({ isActive }) => (
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
                  <Icon className="relative size-[19px] shrink-0" strokeWidth={isActive ? 2.3 : 2} aria-hidden />
                  <span className="relative">{label(text)}</span>
                </>
              )}
            </NavLink>
          )
          return collapsed ? (
            <Tooltip key={to} content={text} side="right">
              {link}
            </Tooltip>
          ) : (
            link
          )
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-3 px-3 pb-4">
        {!collapsed && (
          <p className="rounded-xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Preview mode.</span> You’re viewing sample data; nothing is billed.
          </p>
        )}
        {(() => {
          const button = (
            <button
              type="button"
              onClick={handleLogout}
              aria-label={collapsed ? 'Log out' : undefined}
              className={cn('flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger', collapsed && 'justify-center gap-0 px-0')}
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

export function DesktopSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/80 bg-card py-5 md:flex print:hidden"
    >
      <div className={cn('mb-7 flex h-10 items-center px-6', collapsed && 'justify-center px-0')}>
        <HomeLink>{collapsed ? <LogoMark /> : <Logo />}</HomeLink>
      </div>
      <SidebarNav collapsed={collapsed} indicatorId="nav-active-desktop" />
      <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="absolute -right-3.5 top-[26px] grid size-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>
      </Tooltip>
    </motion.aside>
  )
}

export function MobileDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
                  <HomeLink onClick={() => onOpenChange(false)}>
                    <Logo />
                  </HomeLink>
                  <DialogPrimitive.Close
                    aria-label="Close menu"
                    className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>
                <SidebarNav collapsed={false} indicatorId="nav-active-mobile" onNavigate={() => onOpenChange(false)} />
              </motion.aside>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
