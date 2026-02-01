'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastStyles = {
  success: {
    bg: 'bg-green-900/90',
    border: 'border-green-500/50',
    icon: 'text-green-400',
    title: 'text-green-300',
    glow: 'shadow-green-500/20',
  },
  error: {
    bg: 'bg-red-900/90',
    border: 'border-red-500/50',
    icon: 'text-red-400',
    title: 'text-red-300',
    glow: 'shadow-red-500/20',
  },
  warning: {
    bg: 'bg-yellow-900/90',
    border: 'border-yellow-500/50',
    icon: 'text-yellow-400',
    title: 'text-yellow-300',
    glow: 'shadow-yellow-500/20',
  },
  info: {
    bg: 'bg-blue-900/90',
    border: 'border-blue-500/50',
    icon: 'text-blue-400',
    title: 'text-blue-300',
    glow: 'shadow-blue-500/20',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const Icon = toastIcons[toast.type]
  const styles = toastStyles[toast.type]

  useEffect(() => {
    const duration = toast.duration || 5000
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300)

    const removeTimer = setTimeout(() => {
      onRemove()
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [toast.duration, onRemove])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onRemove, 300)
  }

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl
        ${styles.bg} ${styles.border}
        shadow-lg ${styles.glow}
        transform transition-all duration-300 ease-out
        ${isExiting
          ? 'opacity-0 translate-x-full scale-95'
          : 'opacity-100 translate-x-0 scale-100 animate-slide-in-right'
        }
      `}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${styles.icon.replace('text-', 'bg-')} animate-shrink-width`}
          style={{ animationDuration: `${toast.duration || 5000}ms` }}
        />
      </div>

      <Icon className={`${styles.icon} shrink-0 mt-0.5`} size={20} />

      <div className="flex-1 min-w-0">
        <p className={`font-medium ${styles.title}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-gray-400 text-sm mt-1">{toast.message}</p>
        )}
      </div>

      <button
        onClick={handleClose}
        className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 7000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
