import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  Layers,
  LifeBuoy,
  Tags,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { base, type MarqueeCard, Pill } from '~/components/landing/hero-cards'
import { company } from '~/lib/company'
import { daysFromNow, formatDate, formatMoney } from '~/lib/format'
import { daysLeft, periodUnit, termProgress } from '~/lib/term'
import { cn } from '~/lib/utils'
import type { getMyOverview } from '~/server/functions/portal'

export type Overview = Awaited<ReturnType<typeof getMyOverview>>

/**
 * The public home page's slideshow cards, holding the customer's own figures. The cards repeat and
 * keep moving, so they are mouse shortcuts only (`tabIndex={-1}`): the page's sentence and buttons
 * and the navigation bar give keyboards and screen readers the same things.
 */
const amount =
  'tabular text-base font-extrabold leading-tight tracking-tight sm:text-xl lg:text-2xl'
const label = 'text-[9px] font-semibold text-muted-foreground sm:text-[11px]'

function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-lg sm:size-8 sm:rounded-xl [&_svg]:size-3.5 sm:[&_svg]:size-[18px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

function PlanCard({ data }: { data: Overview }) {
  const sub = data.current
  if (!sub) {
    return (
      <Link to="/portal/plans" tabIndex={-1} className={cn(base, 'bg-secondary')}>
        <IconTile className="bg-white">
          <Layers />
        </IconTile>
        <div>
          <p className="text-[11px] font-extrabold leading-tight sm:text-sm">
            No active subscription
          </p>
          <p className="mt-0.5 text-[9px] text-muted-foreground sm:text-[11px]">Browse plans</p>
        </div>
      </Link>
    )
  }

  const left = daysLeft(sub.expiryDate, data.today)
  return (
    <Link
      to="/portal/subscriptions/$id"
      params={{ id: sub.id }}
      tabIndex={-1}
      className={cn(base, 'bg-gradient-to-br from-[#E2503A] via-[#CF3A44] to-[#B51F52] text-white')}
    >
      <div className="flex items-center justify-between gap-1">
        <IconTile className="bg-white/20">
          <Layers />
        </IconTile>
        <Pill className="bg-white/20 text-white">
          {data.activeSubscriptions > 1 ? `${data.activeSubscriptions} active` : 'Active'}
        </Pill>
      </div>
      <div>
        <p className="text-[11px] font-extrabold leading-tight sm:text-sm">{sub.planName}</p>
        <p className={cn(amount, 'mt-1')}>{formatMoney(sub.amount + sub.tax)}</p>
        <p className="text-[9px] font-semibold opacity-90 sm:text-[11px]">
          per {periodUnit[sub.billingPeriod] ?? sub.billingPeriod}, with tax
        </p>
      </div>
      {left === null ? null : (
        <div>
          <div className="h-1 overflow-hidden rounded-full bg-white/25 sm:h-1.5">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${termProgress(sub.startDate, sub.expiryDate, data.today)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[8px] font-semibold opacity-90 sm:text-[10px]">
            {left} {left === 1 ? 'day' : 'days'} left
          </p>
        </div>
      )}
    </Link>
  )
}

function NextBillCard({ data }: { data: Overview }) {
  const date = data.current?.nextInvoiceDate ?? null
  const days = date ? daysFromNow(date, data.today) : null
  return (
    <Link
      to="/portal/subscriptions"
      search={{ page: 1 }}
      tabIndex={-1}
      className={cn(base, 'bg-foreground text-white')}
    >
      <CalendarClock className="size-5 text-brand-blush sm:size-6" />
      <div>
        <p className="tabular text-3xl font-extrabold leading-none tracking-tight sm:text-5xl">
          {days === null ? 'None' : days > 0 ? days : 'Today'}
        </p>
        <p className="mt-1 text-[9px] font-semibold text-white/80 sm:text-[11px]">
          {days === null
            ? 'No bill scheduled'
            : days > 0
              ? `${days === 1 ? 'day' : 'days'} to your next bill`
              : 'is your next bill'}
        </p>
        {date ? (
          <p className="mt-0.5 text-[8px] text-white/70 sm:text-[10px]">{formatDate(date)}</p>
        ) : null}
      </div>
    </Link>
  )
}

function ToPayCard({ data }: { data: Overview }) {
  const { outstanding, outstandingInvoices, overdueInvoices } = data
  return (
    <Link to="/portal/invoices" search={{ page: 1 }} tabIndex={-1} className={cn(base, 'bg-white')}>
      <IconTile className="bg-secondary">
        <FileText />
      </IconTile>
      <div>
        <p className={label}>To pay</p>
        <p className={amount}>{formatMoney(outstanding)}</p>
        {outstanding === 0 ? (
          <Pill className="mt-1 bg-success-soft text-success">
            <CheckCircle2 className="size-2.5 sm:size-3" /> All paid
          </Pill>
        ) : overdueInvoices > 0 ? (
          <Pill className="mt-1 bg-danger-soft text-danger">{overdueInvoices} overdue</Pill>
        ) : (
          <Pill className="mt-1 bg-warning-soft text-warning">
            {outstandingInvoices} {outstandingInvoices === 1 ? 'invoice' : 'invoices'}
          </Pill>
        )}
      </div>
    </Link>
  )
}

function LastPaymentCard({ data }: { data: Overview }) {
  const payment = data.lastPayment
  return (
    <Link to="/portal/payments" search={{ page: 1 }} tabIndex={-1} className={cn(base, 'bg-white')}>
      <IconTile className="bg-secondary">
        <CreditCard />
      </IconTile>
      <div>
        <p className={label}>Last payment</p>
        <p className={amount}>{payment ? formatMoney(payment.amount) : 'None yet'}</p>
        <p className="mt-0.5 text-[8px] text-muted-foreground sm:text-[10px]">
          {payment ? `Paid ${formatDate(payment.paidOn)}` : 'Payments will show here'}
        </p>
      </div>
    </Link>
  )
}

/** Title and hint on a coloured card, like the home page's plan cards. */
function ShortcutText({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold leading-tight sm:text-sm">{title}</p>
      <p className="mt-0.5 text-[9px] opacity-90 sm:text-[11px]">{hint}</p>
    </div>
  )
}

function PlansCard() {
  return (
    <Link
      to="/portal/plans"
      tabIndex={-1}
      className={cn(base, 'bg-gradient-to-br from-[#EFB11D] to-[#E8651A] text-white')}
    >
      <Tags className="size-5 sm:size-7" />
      <ShortcutText title="Browse plans" hint="See what’s available" />
    </Link>
  )
}

function AccountCard() {
  return (
    <Link
      to="/portal/profile"
      tabIndex={-1}
      className={cn(base, 'bg-gradient-to-br from-[#FFA2B6] to-[#B51F52] text-white')}
    >
      <UserRound className="size-5 sm:size-7" />
      <ShortcutText title="My account" hint="Your details" />
    </Link>
  )
}

function HelpCard() {
  return (
    <a
      href={`mailto:${company.supportEmail}`}
      tabIndex={-1}
      className={cn(base, 'bg-gradient-to-br from-[#FF8FA8] to-[#E2503A] text-white')}
    >
      <LifeBuoy className="size-5 sm:size-7" />
      <ShortcutText title="Need help?" hint="Email support" />
    </a>
  )
}

export function homeCards(data: Overview): MarqueeCard[] {
  return [
    { key: 'plan', node: <PlanCard data={data} /> },
    { key: 'to-pay', node: <ToPayCard data={data} /> },
    { key: 'plans', node: <PlansCard /> },
    { key: 'next-bill', node: <NextBillCard data={data} /> },
    { key: 'last-payment', node: <LastPaymentCard data={data} /> },
    { key: 'account', node: <AccountCard /> },
    { key: 'help', node: <HelpCard /> },
  ]
}
