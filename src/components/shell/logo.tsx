import { cn } from '~/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient shadow-glow',
        className,
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className="size-[62%]"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M9 16a7 7 0 0 1 12-4.9L23 13M23 16a7 7 0 0 1-12 4.9L9 19" />
      </svg>
    </span>
  )
}

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {showName && <span className="text-[19px] font-extrabold tracking-tight">Brightloop</span>}
    </span>
  )
}
