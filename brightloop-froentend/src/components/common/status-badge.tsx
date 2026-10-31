import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { InvoiceStatus, PaymentStatus, SubscriptionStatus } from '@/types'

type Tone = NonNullable<BadgeProps['tone']>

const invoiceMap: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  overdue: { label: 'Overdue', tone: 'danger' },
  draft: { label: 'Draft', tone: 'neutral' },
}

const subscriptionMap: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  paused: { label: 'Paused', tone: 'info' },
  closed: { label: 'Closed', tone: 'neutral' },
}

const paymentMap: Record<PaymentStatus, { label: string; tone: Tone }> = {
  succeeded: { label: 'Successful', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
}

export const invoiceStatusLabel = (s: InvoiceStatus) => invoiceMap[s].label

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const { label, tone } = invoiceMap[status]
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  )
}

export function SubscriptionStatusBadge({ status, className }: { status: SubscriptionStatus; className?: string }) {
  const { label, tone } = subscriptionMap[status]
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  )
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const { label, tone } = paymentMap[status]
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  )
}
