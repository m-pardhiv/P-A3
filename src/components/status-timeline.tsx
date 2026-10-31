import { Check } from 'lucide-react'

const STEPS = ['draft', 'quotation', 'confirmed', 'active', 'closed'] as const

export function StatusTimeline({ status }: { status: string }) {
  // Paused sits on the Active step: the subscription has started but is on hold.
  const current = STEPS.indexOf(status === 'paused' ? 'active' : (status as (typeof STEPS)[number]))

  return (
    <ol aria-label="Subscription progress" className="flex flex-wrap gap-x-1 gap-y-2">
      {STEPS.map((step, index) => {
        const done = index < current
        const here = index === current
        const finished = here && step === 'closed'
        const label = here && status === 'paused' ? 'Paused' : step

        return (
          <li key={step} className="flex items-center gap-1">
            {index > 0 ? (
              <span className={`h-0.5 w-5 sm:w-8 ${index <= current ? 'bg-ink' : 'bg-line'}`} />
            ) : null}
            <span
              aria-current={here ? 'step' : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm capitalize ${
                here
                  ? 'bg-ink font-semibold text-white ring-2 ring-marigold'
                  : done
                    ? 'bg-neutral-soft text-ink'
                    : 'text-muted'
              }`}
            >
              {done || finished ? <Check size={14} aria-hidden /> : null}
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
