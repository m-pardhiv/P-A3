import { motion } from 'framer-motion'
import { cn } from '~/lib/utils'

/**
 * Horizontally scrollable on small screens; the inner table keeps a sensible minimum width.
 * The wrapper is `relative` so absolutely-positioned children (e.g. sr-only labels) are clipped by it.
 */
export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="thin-scroll relative w-full overflow-x-auto">
      <table className={cn('w-full min-w-[640px] caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('border-b border-border/80', className)} {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&>tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({
  className,
  index,
  ...props
}: Omit<React.ComponentProps<typeof motion.tr>, 'children'> & {
  index?: number
  children?: React.ReactNode
}) {
  return (
    <motion.tr
      initial={index === undefined ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index ?? 0, 10) * 0.035, ease: 'easeOut' }}
      className={cn(
        'border-b border-border/70 transition-colors duration-150 hover:bg-accent/60',
        className,
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-11 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-middle first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
        className,
      )}
      {...props}
    />
  )
}
