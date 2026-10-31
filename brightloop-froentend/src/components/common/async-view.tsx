import { Card } from '@/components/ui/card'
import { ErrorState } from './states'

type State<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string }

/** Renders a skeleton while loading, a retryable error, or the content once data is ready. */
export function AsyncView<T>({
  state,
  skeleton,
  onRetry,
  children,
}: {
  state: State<T>
  skeleton: React.ReactNode
  onRetry: () => void
  children: (data: T) => React.ReactNode
}) {
  if (state.status === 'loading') return <>{skeleton}</>
  if (state.status === 'error')
    return (
      <Card>
        <ErrorState message={state.error} onRetry={onRetry} />
      </Card>
    )
  return <>{children(state.data)}</>
}
