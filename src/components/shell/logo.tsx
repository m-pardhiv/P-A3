import { cn } from '~/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      width={256}
      height={256}
      className={cn('size-9 shrink-0', className)}
    />
  )
}

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark />
      {showName && <span className="text-[19px] font-extrabold tracking-tight">Brightloop</span>}
    </span>
  )
}
