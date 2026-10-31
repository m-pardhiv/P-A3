import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState(props: {
  title: string
  message: string
  action?: ReactNode
  icon?: LucideIcon
}) {
  const Icon = props.icon ?? Inbox
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-brand-ink">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="text-base font-bold">{props.title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {props.message}
      </p>
      {props.action ? <div className="mt-5">{props.action}</div> : null}
    </div>
  )
}
