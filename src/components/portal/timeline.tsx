import { motion } from 'framer-motion'
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileText,
  type LucideIcon,
  Mail,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { capitalize, formatDate } from '~/lib/format'
import { cn } from '~/lib/utils'

type Entry = {
  id: string
  action: string
  fromStatus: string | null
  toStatus: string
  createdAt: Date | string
}

const META: Record<string, { title: string; icon: LucideIcon; bad?: boolean }> = {
  created: { title: 'Subscription created', icon: CircleDot },
  send: { title: 'Quotation prepared', icon: FileText },
  quotation_emailed: { title: 'Quotation emailed to you', icon: Mail },
  confirm: { title: 'Subscription confirmed', icon: CheckCircle2 },
  activate: { title: 'Subscription activated', icon: CheckCircle2 },
  pause: { title: 'Subscription paused', icon: PauseCircle },
  resume: { title: 'Subscription resumed', icon: PlayCircle },
  renew: { title: 'Renewal started', icon: RefreshCw },
  lines_updated: { title: 'Products and quantities updated', icon: RefreshCw },
  close: { title: 'Subscription closed', icon: XCircle, bad: true },
  auto_close: { title: 'Closed at the end of its term', icon: XCircle, bad: true },
}

/** Newest first. An optional "next invoice" note sits on top as what is coming. */
export function Timeline(props: { events: Entry[]; nextInvoice?: string | null }) {
  const rows = [
    ...(props.nextInvoice
      ? [
          {
            id: 'upcoming',
            title: 'Next invoice',
            note: `Scheduled · ${formatDate(props.nextInvoice)}`,
            detail: 'The next billing period is invoiced on this date.',
            icon: CalendarClock,
            upcoming: true,
            bad: false,
          },
        ]
      : []),
    ...[...props.events].reverse().map((event) => {
      const meta = META[event.action] ?? { title: capitalize(event.action), icon: CircleDot }
      const day = new Date(event.createdAt).toISOString().slice(0, 10)
      return {
        id: event.id,
        title: meta.title,
        note: formatDate(day),
        detail: undefined as string | undefined,
        icon: meta.icon,
        upcoming: false,
        bad: Boolean(meta.bad),
      }
    }),
  ]

  return (
    <ol className="relative">
      {rows.map((row, index) => {
        const Icon = row.icon
        return (
          <motion.li
            key={row.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.06 }}
            className="relative flex gap-3.5 pb-6 last:pb-0"
          >
            {index < rows.length - 1 && (
              <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-px bg-border" />
            )}
            <span
              className={cn(
                'relative z-10 grid size-8 shrink-0 place-items-center rounded-full',
                row.upcoming
                  ? 'border border-dashed border-brand-raspberry/60 bg-card text-brand-ink'
                  : row.bad
                    ? 'bg-danger-soft text-danger'
                    : 'bg-accent text-brand-ink',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold leading-snug">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.note}</p>
              {row.detail ? (
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{row.detail}</p>
              ) : null}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
