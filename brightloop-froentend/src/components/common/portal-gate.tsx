import { Card } from '@/components/ui/card'
import { usePortal } from '@/context/portal'
import { ErrorState } from './states'

/** Renders `fallback` (a skeleton) while loading and a retryable error state on failure. */
export function PortalGate({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) {
  const { status, error, reload } = usePortal()
  if (status === 'loading') return <>{fallback}</>
  if (status === 'error')
    return (
      <Card>
        <ErrorState message={error} onRetry={reload} />
      </Card>
    )
  return <>{children}</>
}
