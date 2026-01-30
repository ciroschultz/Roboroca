'use client'

import { Bell, Search, User, Moon, Sun } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(true)

  return (
    <header className="h-16 bg-[#1a1a2e]/80 backdrop-blur-sm border-b border-gray-700/50 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Título da página */}
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>

      {/* Barra de pesquisa e ações */}
      <div className="flex items-center gap-4">
        {/* Barra de pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar projetos, análises..."
            className="w-80 pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
          />
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2">
          {/* Toggle tema */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Alternar tema"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notificações */}
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#6AAF3D] rounded-full"></span>
          </button>

          {/* Perfil */}
          <button className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6AAF3D] to-[#1B3A5C] flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}
