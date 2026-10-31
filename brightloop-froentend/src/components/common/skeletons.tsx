import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="px-5 py-3 sm:px-6">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-b border-border/60 py-4 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={c === 0 ? 'h-4 w-28' : 'h-4 flex-1'} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function StatSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3.5 w-40" />
    </Card>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-1/4" />
          </div>
        </div>
        <Skeleton className="mt-6 h-7 w-32" />
        <div className="mt-6 grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      </div>
    </Card>
  )
}
