import type { LucideIcon } from 'lucide-react'
import { MotionCard } from '~/components/ui/card'
import { staggerItem } from '~/lib/motion'
import { cn } from '~/lib/utils'

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint: React.ReactNode
  tone?: 'brand' | 'warn'
}) {
  return (
    <MotionCard
      variants={staggerItem}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        <span
          className={cn(
            'grid size-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110',
            tone === 'brand' ? 'bg-accent text-brand-ink' : 'bg-warning-soft text-warning',
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className="tabular mt-3 text-[28px] font-extrabold leading-none tracking-tight">{value}</p>
      <p className="mt-2 text-[13px] text-muted-foreground">{hint}</p>
    </MotionCard>
  )
}
