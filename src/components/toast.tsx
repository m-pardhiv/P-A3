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
            className={`rounded-control px-4 py-2.5 text-white ${toast.tone === 'success' ? 'bg-success' : 'bg-danger'}`}
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
