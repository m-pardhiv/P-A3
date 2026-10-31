const toneClasses = {
  neutral: 'bg-secondary text-secondary-foreground',
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
  paused: 'info',
  closed: 'neutral',
  paid: 'success',
  cancelled: 'neutral',
  overdue: 'danger',
  'to pay': 'warning',
  admin: 'info',
  staff: 'neutral',
  inactive: 'neutral',
  scheduled: 'info',
  expired: 'neutral',
  'used up': 'warning',
}

/** A status as a small pill with a dot, so the meaning never rests on colour alone. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none capitalize ${toneClasses[statusTones[status] ?? 'neutral']}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  )
}
