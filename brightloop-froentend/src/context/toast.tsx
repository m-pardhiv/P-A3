import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastApi {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const icons = {
  success: { Icon: CheckCircle2, className: 'bg-success-soft text-success' },
  error: { Icon: AlertCircle, className: 'bg-danger-soft text-danger' },
  info: { Icon: Info, className: 'bg-accent text-accent-foreground' },
} as const

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = ++counter.current
      setToasts((all) => [...all.slice(-3), { id, tone, title, description }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4200)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ol
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-end gap-2 p-4 sm:bottom-2 sm:right-2 sm:left-auto sm:w-[26rem]"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { Icon, className } = icons[t.tone]
            return (
              <motion.li
                key={t.id}
                layout
                role={t.tone === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, x: 48, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 48, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-lift"
              >
                <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full', className)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold leading-snug">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{t.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
