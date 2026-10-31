import { BarChart3, Braces, ClipboardList, LifeBuoy, Palette, Workflow, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductIconKey } from '@/types'

const config: Record<ProductIconKey, { Icon: LucideIcon; gradient: string }> = {
  analytics: { Icon: BarChart3, gradient: 'from-[#E2503A] to-[#B51F52]' },
  workflows: { Icon: Workflow, gradient: 'from-[#B51F52] to-[#FF8FA8]' },
  api: { Icon: Braces, gradient: 'from-[#1d1815] to-[#4a3b36]' },
  studio: { Icon: Palette, gradient: 'from-[#EFB11D] to-[#E8651A]' },
  forms: { Icon: ClipboardList, gradient: 'from-[#a89f92] to-[#7c7468]' },
  support: { Icon: LifeBuoy, gradient: 'from-[#FF8FA8] to-[#E2503A]' },
}

export function ProductIcon({
  icon,
  className,
  muted,
}: {
  icon: ProductIconKey
  className?: string
  /** Desaturate for closed / inactive subscriptions. */
  muted?: boolean
}) {
  const { Icon, gradient } = config[icon]
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
        gradient,
        muted && 'opacity-60 saturate-50',
        className,
      )}
    >
      <Icon className="size-[45%]" strokeWidth={2} />
    </span>
  )
}
