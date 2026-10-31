import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const OpenContext = createContext(false)

interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

/** Radix dialog that tracks its open state so the content can animate out with Framer Motion. */
export function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [internal, setInternal] = useState(defaultOpen)
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
      <DialogPrimitive.Root open={current} onOpenChange={handleChange}>
        {children}
      </DialogPrimitive.Root>
    </OpenContext.Provider>
  )
}

export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  const open = useContext(OpenContext)
  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
          </DialogPrimitive.Overlay>
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <DialogPrimitive.Content asChild forceMount {...props}>
              <motion.div
                className={cn(
                  'relative w-full max-w-md rounded-[1.5rem] border border-border/80 bg-card p-6 shadow-lift focus:outline-none sm:p-7',
                  className,
                )}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
                {!hideClose && (
                  <DialogPrimitive.Close
                    className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </DialogPrimitive.Close>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </div>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-5 flex flex-col gap-1.5 pr-8', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-bold tracking-tight', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
}
