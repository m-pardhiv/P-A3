import type { ReactNode } from 'react'

export function EmptyState(props: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-panel border border-dashed border-line px-6 py-14 text-center">
      <h2 className="text-lg font-semibold">{props.title}</h2>
      <p className="max-w-md text-muted">{props.message}</p>
      {props.action}
    </div>
  )
}
