import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Roboroça - Automação Agrícola',
  description: 'Sistema Inteligente de Análise de Imagens Aéreas para Agricultura',
  icons: {
    icon: '/favicon.png',
    apple: '/logo-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0f0f1a] text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
