import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react'

type Tone = 'success' | 'danger'
type Toast = { id: number; message: string; tone: Tone }

const TOAST_MS = 4000

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, tone: Tone = 'success') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), TOAST_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            role={toast.tone === 'danger' ? 'alert' : 'status'}
            className="flex max-w-sm animate-fade-scale-in items-start gap-2.5 rounded-2xl border border-border/80 bg-card py-3 pr-4 pl-3.5 text-sm font-semibold shadow-lift"
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="mt-px size-[18px] shrink-0 text-success" aria-hidden />
            ) : (
              <TriangleAlert className="mt-px size-[18px] shrink-0 text-danger" aria-hidden />
            )}
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
