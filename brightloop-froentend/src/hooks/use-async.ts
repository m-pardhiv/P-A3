import { useCallback, useEffect, useState } from 'react'

type State<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string }

/** Runs an async loader on mount (and on `reload`), exposing loading / ready / error plus a local setter for optimistic updates. */
export function useAsync<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    load()
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((e: unknown) => !cancelled && setState({ status: 'error', error: e instanceof Error ? e.message : 'Something went wrong.' }))
    return () => {
      cancelled = true
    }
    // `load` is a stable api call at every call site; `attempt` re-runs it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const setData = useCallback((fn: (d: T) => T) => setState((s) => (s.status === 'ready' ? { status: 'ready', data: fn(s.data) } : s)), [])

  return { state, reload, setData }
}
