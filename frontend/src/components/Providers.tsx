'use client'

import { ToastProvider } from './Toast'
import { ConfirmDialogProvider } from './ConfirmDialog'
import { NotificationProvider } from './NotificationContext'
import { I18nProvider } from '@/lib/i18n'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ConfirmDialogProvider>
      </ToastProvider>
    </I18nProvider>
  )
}
