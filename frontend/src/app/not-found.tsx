'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f2027] flex items-center justify-center p-4">
      <div className="text-center">
        <img
          src="/logo-icon.png"
          alt="Roboroça"
          className="w-24 h-24 mx-auto mb-6"
        />
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-xl text-gray-400 mb-6">Página não encontrada</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-semibold rounded-lg transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
