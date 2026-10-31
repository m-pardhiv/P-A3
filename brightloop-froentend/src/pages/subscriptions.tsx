import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { useState } from 'react'
import { PortalGate } from '@/components/common/portal-gate'
import { CardSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import { usePortalData } from '@/context/portal'
import { SubscriptionCard } from '@/features/subscriptions/subscription-card'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { SubscriptionStatus } from '@/types'

type Filter = 'all' | SubscriptionStatus

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
]

function SubscriptionsContent() {
  const { subscriptions } = usePortalData()
  const [filter, setFilter] = useState<Filter>('all')

  const count = (f: Filter) => (f === 'all' ? subscriptions.length : subscriptions.filter((s) => s.status === f).length)
  const visible = filter === 'all' ? subscriptions : subscriptions.filter((s) => s.status === filter)

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Everything you subscribe to with Brightloop. Select a subscription to see its pricing, history and what you can change.
      </p>

      <div role="group" aria-label="Filter subscriptions by status" className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                'relative flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                active ? 'border-transparent text-white' : 'border-border bg-card text-foreground/80 hover:border-foreground/25',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sub-filter"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                />
              )}
              <span className="relative">{f.label}</span>
              <span
                className={cn(
                  'tabular relative grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-5',
                  active ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground',
                )}
              >
                {count(f.value)}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title={`No ${filter} subscriptions`}
            description="When you have a subscription in this state, it will show up here."
          />
        </Card>
      ) : (
        <motion.div
          key={filter}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {visible.map((sub) => (
            <SubscriptionCard key={sub.id} sub={sub} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default function SubscriptionsPage() {
  useDocumentTitle('My Subscriptions')
  return (
    <PortalGate
      fallback={
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <SubscriptionsContent />
    </PortalGate>
  )
}
