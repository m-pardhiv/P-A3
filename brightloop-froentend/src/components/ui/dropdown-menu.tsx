import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const OpenContext = createContext(false)

interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

/** Radix dropdown that tracks open state so the menu can fade/scale in and out with Framer Motion. */
export function DropdownMenu({ open, onOpenChange, children }: DropdownMenuProps) {
  const [internal, setInternal] = useState(false)
  const controlled = open !== undefined
  const current = controlled ? open : internal
  const handleChange = useCallback(
    (next: boolean) => {
      if (!controlled) setInternal(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  return (
    <OpenContext.Provider value={current}>
      <MenuPrimitive.Root open={current} onOpenChange={handleChange}>
        {children}
      </MenuPrimitive.Root>
    </OpenContext.Provider>
  )
}

export const DropdownMenuTrigger = MenuPrimitive.Trigger

export function DropdownMenuContent({
  className,
  children,
  sideOffset = 8,
  align = 'end',
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Content>) {
  const open = useContext(OpenContext)
  return (
    <AnimatePresence>
      {open && (
        <MenuPrimitive.Portal forceMount>
          <MenuPrimitive.Content asChild forceMount sideOffset={sideOffset} align={align} {...props}>
            <motion.div
              className={cn(
                'z-[60] min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-lift focus:outline-none',
                className,
              )}
              style={{ transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)' }}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -2 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      )}
    </AnimatePresence>
  )
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:[&_svg]:text-current',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive && 'text-destructive data-[highlighted]:bg-danger-soft data-[highlighted]:text-destructive [&_svg]:text-destructive',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn('px-3 py-2 text-xs font-semibold text-muted-foreground', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('-mx-1.5 my-1.5 h-px bg-border', className)} {...props} />
}
