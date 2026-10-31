import { Bell, CalendarClock, ChevronDown, ChevronRight, FileText, LogOut, Menu, Sparkles, UserRound, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip } from '@/components/ui/tooltip'
import { getPageMeta } from '@/config/navigation'
import { usePortal } from '@/context/portal'
import { useToast } from '@/context/toast'
import { formatRelativeDays, greetingForNow } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NotificationKind } from '@/types'

const kindIcon: Record<NotificationKind, typeof Bell> = {
  invoice: FileText,
  payment: Wallet,
  renewal: CalendarClock,
  product: Sparkles,
}

function NotificationsMenu() {
  const { data, markNotificationsRead } = usePortal()
  const toast = useToast()
  const notifications = data?.notifications ?? []
  const unread = notifications.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <Tooltip content="Notifications">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            className="relative grid size-11 place-items-center rounded-full border border-border/80 bg-card text-foreground/80 shadow-soft transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Bell className="size-[18px]" />
            {unread > 0 && (
              <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-brand-ember ring-2 ring-card" aria-hidden />
            )}
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-bold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs font-semibold text-brand-ink hover:underline"
              onClick={async (e) => {
                e.preventDefault()
                await markNotificationsRead()
                toast.success('All caught up', 'Notifications marked as read.')
              }}
            >
              Mark all as read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">You’re all caught up.</p>
          ) : (
            notifications.map((n) => {
              const Icon = kindIcon[n.kind]
              return (
                <DropdownMenuItem key={n.id} asChild className="items-start py-3">
                  <Link to={n.href ?? '/overview'}>
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent [&_svg]:text-brand-ink">
                      <Icon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn('text-[13px]', n.read ? 'font-medium' : 'font-bold')}>{n.title}</span>
                        {!n.read && <span className="size-2 shrink-0 rounded-full bg-brand-ember" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal leading-snug text-muted-foreground">{n.body}</span>
                      <span className="mt-1 block text-[11px] font-normal text-muted-foreground/80">
                        {formatRelativeDays(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProfileMenu() {
  const { data, session, signOut } = usePortal()
  const navigate = useNavigate()
  const isCustomer = session?.role === 'customer'
  const name = (isCustomer ? data?.customer.fullName : session?.name) ?? 'Account'
  const email = isCustomer ? data?.customer.email : session?.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex h-11 items-center gap-2.5 rounded-full border border-border/80 bg-card py-1 pl-1 pr-3 shadow-soft transition-colors hover:bg-secondary/60 sm:pr-3.5"
          aria-label={`Account menu for ${name}`}
        >
          <Avatar name={name} className="size-9 text-sm" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[11px] font-medium text-muted-foreground">{greetingForNow()},</span>
            <span className="block text-[13px] font-bold">{name}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="pb-2">
          <span className="block text-sm font-bold text-foreground">{name}</span>
          <span className="block truncate font-medium">{email}</span>
          {!isCustomer && (
            <span className="mt-1.5 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold capitalize text-accent-foreground">
              {session?.role}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isCustomer && (
          <DropdownMenuItem asChild>
            <Link to="/account">
              <UserRound /> Profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          destructive
          onSelect={() => {
            navigate('/', { replace: true })
            signOut()
          }}
        >
          <LogOut /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation()
  const { data, session } = usePortal()
  const meta = useMemo(
    () => getPageMeta(pathname, { invoiceNumber: (id) => data?.invoices.find((i) => i.id === id)?.number }),
    [pathname, data],
  )

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur-xl print:hidden">
      <div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border/80 bg-card shadow-soft md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="hidden sm:block">
              <ol className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                {meta.crumbs.map((c, i) => (
                  <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="size-3 opacity-60" aria-hidden />}
                    {c.to ? (
                      <Link to={c.to} className="transition-colors hover:text-foreground">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="text-foreground/70">
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:mt-0.5 sm:text-[22px]">{meta.title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {session?.role === 'customer' && <NotificationsMenu />}
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
