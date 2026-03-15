'use client'

import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, Home, Calculator, Satellite, Tractor, Waves, Camera } from 'lucide-react'

const PLATFORM_BASE = process.env.NEXT_PUBLIC_PLATFORM_BASE || ''

const platforms = [
  { name: 'Hub Central', slug: 'home', port: 3000, color: '#6AAF3D', icon: Home },
  { name: 'Calculadora Agrária', slug: 'calculator', port: 3001, color: '#F59E0B', icon: Calculator },
  { name: 'Agricultura de Precisão', slug: 'precision', port: 3002, color: '#3B82F6', icon: Satellite },
  { name: 'Equipamentos Agrícolas', slug: 'equipment', port: 3003, color: '#10B981', icon: Tractor },
  { name: 'Espectroscopia Raman', slug: 'spectral', port: 3004, color: '#8B5CF6', icon: Waves },
  { name: 'Imagens Aéreas', slug: 'aerial', port: 3005, color: '#6AAF3D', icon: Camera },
]

const SUBDOMAIN_MAP: Record<string, string> = {
  home: '',
  calculator: 'calc',
  precision: 'precision',
  equipment: 'equipment',
  spectral: 'spectral',
  aerial: 'aerial',
}

function getPlatformUrl(slug: string, port: number): string {
  if (PLATFORM_BASE) {
    const sub = SUBDOMAIN_MAP[slug]
    return sub ? PLATFORM_BASE.replace('*', sub) : PLATFORM_BASE.replace('*.', '')
  }
  return `http://localhost:${port}`
}

function openPlatform(slug: string, port: number) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('roboroca_token') : null
  const baseUrl = getPlatformUrl(slug, port)
  const url = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
  window.open(url, '_blank')
}

interface EcosystemNavProps {
  currentSlug: string
}

export default function EcosystemNav({ currentSlug }: EcosystemNavProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700/30 transition-all"
        title="Plataformas Roboroça"
      >
        <LayoutGrid size={20} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1a2e] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-3 border-b border-gray-700/30">
            <p className="text-white font-semibold text-sm">Plataformas Roboroça</p>
            <p className="text-gray-500 text-xs">Navegue entre os módulos</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {platforms.map((p) => {
              const Icon = p.icon
              const isCurrent = p.slug === currentSlug
              return (
                <button
                  key={p.slug}
                  onClick={() => {
                    if (!isCurrent) openPlatform(p.slug, p.port)
                    setOpen(false)
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-gray-700/50 ring-1 ring-gray-600'
                      : 'hover:bg-gray-700/30'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${p.color}20` }}
                  >
                    <Icon size={18} style={{ color: p.color }} />
                  </div>
                  <span className={`text-xs text-center leading-tight ${isCurrent ? 'text-white font-medium' : 'text-gray-400'}`}>
                    {p.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-gray-500">Atual</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
