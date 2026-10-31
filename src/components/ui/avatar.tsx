import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, initials } from '~/lib/utils'

export function Avatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string
  className?: string
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white',
        className,
      )}
    >
      {src && <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />}
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center bg-brand-gradient text-[0.8em] font-bold text-white"
        aria-label={name}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
