const toneClasses = {
  neutral: 'bg-neutral-soft text-neutral',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

const statusTones: Record<string, keyof typeof toneClasses> = {
  draft: 'neutral',
  quotation: 'info',
  confirmed: 'info',
  active: 'success',
  paused: 'warning',
  closed: 'neutral',
  paid: 'success',
  cancelled: 'neutral',
  overdue: 'danger',
  admin: 'info',
  staff: 'neutral',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium capitalize ${toneClasses[statusTones[status] ?? 'neutral']}`}
    >
      {status}
    </span>
  )
}
