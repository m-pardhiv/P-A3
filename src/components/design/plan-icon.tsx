import {
  BarChart3,
  Braces,
  ClipboardList,
  LifeBuoy,
  type LucideIcon,
  Palette,
  Workflow,
} from 'lucide-react'
import { cn } from '~/lib/utils'

const icons: { Icon: LucideIcon; gradient: string }[] = [
  { Icon: BarChart3, gradient: 'from-[#E2503A] to-[#B51F52]' },
  { Icon: Workflow, gradient: 'from-[#B51F52] to-[#FF8FA8]' },
  { Icon: Braces, gradient: 'from-[#1d1815] to-[#4a3b36]' },
  { Icon: Palette, gradient: 'from-[#EFB11D] to-[#E8651A]' },
  { Icon: ClipboardList, gradient: 'from-[#a89f92] to-[#7c7468]' },
  { Icon: LifeBuoy, gradient: 'from-[#FF8FA8] to-[#E2503A]' },
]

/** The same plan name always gets the same icon and colour, so a plan is easy to spot again. */
function pick(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return icons[hash % icons.length]
}

export function PlanIcon(props: { name: string; className?: string; muted?: boolean }) {
  const { Icon, gradient } = pick(props.name)
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
        gradient,
        props.muted && 'opacity-60 saturate-50',
        props.className,
      )}
    >
      <Icon className="size-[45%]" strokeWidth={2} />
    </span>
  )
}
