import { motion } from 'framer-motion'
import { cn } from '~/lib/utils'

export function Progress({
  value,
  label,
  className,
  barClassName,
}: {
  value: number
  label: string
  className?: string
  barClassName?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
    >
      <motion.div
        className={cn('h-full rounded-full bg-brand-gradient', barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </div>
  )
}
