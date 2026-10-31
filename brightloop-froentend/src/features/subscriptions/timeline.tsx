import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, CircleDot, CreditCard, FileText, PauseCircle, PlayCircle, RefreshCw, XCircle, type LucideIcon } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TimelineEvent, TimelineKind } from '@/types'

const iconFor: Record<TimelineKind, LucideIcon> = {
  created: CircleDot,
  activated: CheckCircle2,
  invoice: FileText,
  payment: CreditCard,
  paused: PauseCircle,
  resumed: PlayCircle,
  renewed: RefreshCw,
  cancelled: XCircle,
  closed: XCircle,
  upcoming: CalendarClock,
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  // Newest first, with upcoming events pinned to the top as "what's next".
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <ol className="relative">
      {sorted.map((event, i) => {
        const Icon = iconFor[event.kind]
        const upcoming = event.kind === 'upcoming'
        const destructive = event.kind === 'cancelled' || event.kind === 'closed'
        return (
          <motion.li
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
            className="relative flex gap-3.5 pb-6 last:pb-0"
          >
            {i < sorted.length - 1 && <span aria-hidden className="absolute bottom-0 left-[15px] top-8 w-px bg-border" />}
            <span
              className={cn(
                'relative z-10 grid size-8 shrink-0 place-items-center rounded-full',
                upcoming
                  ? 'border border-dashed border-brand-raspberry/60 bg-card text-brand-ink'
                  : destructive
                    ? 'bg-danger-soft text-danger'
                    : 'bg-accent text-brand-ink',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold leading-snug">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {upcoming ? 'Scheduled · ' : ''}
                {formatDate(event.date)}
              </p>
              {event.description && <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{event.description}</p>}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
