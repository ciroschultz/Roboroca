'use client'

import { ToastProvider } from './Toast'
import { ConfirmDialogProvider } from './ConfirmDialog'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        {children}
      </ConfirmDialogProvider>
    </ToastProvider>
  )
}
