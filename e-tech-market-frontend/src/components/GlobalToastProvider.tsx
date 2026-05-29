/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ToastType = 'success' | 'info' | 'error'

type Toast = {
  id: string
  type: ToastType
  message: string
}

type GlobalToastContextValue = {
  showToast: (toast: Omit<Toast, 'id'>) => void
}

const GlobalToastContext = createContext<GlobalToastContextValue>({
  showToast: () => {
    // noop
  },
})

export function GlobalToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    setToasts((prev) => [...prev, { id, ...toast }])
    window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 5000)
  }, [])

  useEffect(() => {
    const handleGlobalError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>
      const message = customEvent.detail?.message || 'Đã xảy ra lỗi không xác định.'
      showToast({ type: 'error', message })
    }

    window.addEventListener('global-error', handleGlobalError as EventListener)
    return () => window.removeEventListener('global-error', handleGlobalError as EventListener)
  }, [showToast])

  const contextValue = useMemo(() => ({ showToast }), [showToast])

  return (
    <GlobalToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        className="global-toast-container"
        style={{
          position: 'fixed',
          zIndex: 9999,
          right: 16,
          bottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '360px',
          width: '100%',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            style={{
              pointerEvents: 'auto',
              borderRadius: '16px',
              padding: '14px 18px',
              boxShadow: '0 14px 32px rgba(15, 23, 42, 0.16)',
              background: toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#16a34a' : '#0f172a',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </GlobalToastContext.Provider>
  )
}

export function useGlobalToast() {
  return useContext(GlobalToastContext)
}
