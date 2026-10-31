import { Badge } from '@/components/ui/badge'
import type { BackofficeCustomer, Ticket, TicketStatus } from '@/types'

export const ticketStatusLabel: Record<TicketStatus, string> = {
  received: 'Open',
  'in-progress': 'In progress',
  resolved: 'Resolved',
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const tone = status === 'received' ? 'warning' : status === 'in-progress' ? 'info' : 'success'
  return (
    <Badge tone={tone} dot>
      {ticketStatusLabel[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: Ticket['priority'] }) {
  return <Badge tone={priority === 'high' ? 'danger' : priority === 'low' ? 'neutral' : 'outline'}>{priority === 'normal' ? 'Normal' : priority === 'high' ? 'High' : 'Low'}</Badge>
}

export function CustomerStatusBadge({ status }: { status: BackofficeCustomer['status'] }) {
  const tone = status === 'active' ? 'success' : status === 'overdue' ? 'danger' : 'neutral'
  return (
    <Badge tone={tone} dot className="capitalize">
      {status}
    </Badge>
  )
}
