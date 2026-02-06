'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, X, CheckCircle, Info } from 'lucide-react'

type DialogType = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: DialogType
  isLoading?: boolean
}

const dialogConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700',
    borderColor: 'border-red-500/30',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
    borderColor: 'border-yellow-500/30',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    borderColor: 'border-blue-500/30',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-700',
    borderColor: 'border-green-500/30',
  },
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const [isClosing, setIsClosing] = useState(false)
  const config = dialogConfig[type]
  const Icon = config.icon

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    if (isLoading) return
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  const handleConfirm = () => {
    onConfirm()
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`
          relative bg-[#1a1a2e] border ${config.borderColor} rounded-2xl shadow-2xl
          max-w-md w-full transform transition-all duration-200
          ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-scale-in'}
        `}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className={`w-14 h-14 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={config.iconColor} size={28} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-white text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-400 text-center mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all btn-press disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 ${config.buttonBg} text-white font-medium rounded-xl transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook para facilitar o uso do dialog
import { createContext, useContext, useCallback, ReactNode } from 'react'

interface DialogOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: DialogType
  onConfirm: () => void | Promise<void>
}

interface ConfirmDialogContextType {
  confirm: (options: DialogOptions) => void
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined)

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider')
  }
  return context
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    isLoading: boolean
    options: DialogOptions | null
  }>({
    isOpen: false,
    isLoading: false,
    options: null,
  })

  const confirm = useCallback((options: DialogOptions) => {
    setDialogState({ isOpen: true, isLoading: false, options })
  }, [])

  const handleClose = useCallback(() => {
    setDialogState({ isOpen: false, isLoading: false, options: null })
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!dialogState.options) return

    setDialogState((prev) => ({ ...prev, isLoading: true }))
    try {
      await dialogState.options.onConfirm()
      handleClose()
    } catch (error) {
      setDialogState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [dialogState.options, handleClose])

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialogState.options && (
        <ConfirmDialog
          {...dialogState.options}
          isOpen={dialogState.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          isLoading={dialogState.isLoading}
        />
      )}
    </ConfirmDialogContext.Provider>
  )
}
