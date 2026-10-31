import { motion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '~/lib/utils'

export type PillTab<T extends string> = { value: T; label: string; count?: number }

/** Rounded filter tabs with a sliding dark highlight and an optional count on each. */
export function PillTabs<T extends string>(props: {
  tabs: PillTab<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const id = useId()
  return (
    <div role="group" aria-label={props.label} className="flex flex-wrap gap-2">
      {props.tabs.map((tab) => {
        const active = props.value === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => props.onChange(tab.value)}
            className={cn(
              'relative flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
              active
                ? 'border-transparent text-white'
                : 'border-border bg-card text-foreground/80 hover:border-foreground/25',
            )}
          >
            {active && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full bg-foreground"
                transition={{ type: 'spring', stiffness: 450, damping: 36 }}
              />
            )}
            <span className="relative">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'tabular relative grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-5',
                  active ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
