import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Roboroça - Automação Agrícola',
  description: 'Sistema Inteligente de Análise de Imagens Aéreas para Agricultura',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/logo-icon.png',
  },
  keywords: ['agricultura', 'drone', 'satélite', 'análise de imagens', 'IA', 'agro', 'roboroça'],
  authors: [{ name: 'Roboroça' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Roboroça',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f1a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0f0f1a] text-white min-h-screen antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
