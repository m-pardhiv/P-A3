import { useEffect, useRef } from 'react'

export function ConfirmDialog(props: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  /** Danger for things that destroy data. Primary for ones that only move work forward. */
  confirmTone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (props.open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [props.open])

  return (
    <dialog
      ref={dialog}
      onClose={props.onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-panel border border-line bg-surface p-6 text-text backdrop:bg-ink/50"
    >
      <h2 className="text-xl font-semibold">{props.title}</h2>
      <p className="mt-2 text-muted">{props.message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
          {props.confirmTone === 'primary' ? 'Cancel' : 'Keep it'}
        </button>
        <button
          type="button"
          className={`btn ${props.confirmTone === 'primary' ? 'btn-primary' : 'btn-danger'}`}
          onClick={props.onConfirm}
        >
          {props.confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
