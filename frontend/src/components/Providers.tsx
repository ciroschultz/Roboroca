'use client'

import { ToastProvider } from './Toast'
import { ConfirmDialogProvider } from './ConfirmDialog'
import { NotificationProvider } from './NotificationContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  )
}
