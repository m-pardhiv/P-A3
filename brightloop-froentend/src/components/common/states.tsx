import { motion } from 'framer-motion'
import { AlertTriangle, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col items-center px-6 py-14 text-center', className)}
    >
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-brand-ink">
        <Icon className="size-6" />
      </span>
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export function ErrorState({
  title = 'We couldn’t load this',
  message,
  onRetry,
  className,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {message ?? 'Something went wrong on our side. Please try again.'}
      </p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
