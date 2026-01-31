'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Map,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  ChevronDown,
  Leaf,
  Thermometer,
  Droplets,
  Mountain,
  Trees,
  Scan,
  Activity
} from 'lucide-react'

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  submenu?: { id: string; label: string; icon: React.ReactNode }[]
}

interface SidebarProps {
  activeItem: string
  onItemClick: (id: string) => void
}

export default function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['analises'])

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      id: 'projetos',
      label: 'Meus Projetos',
      icon: <FolderOpen size={20} />,
    },
    {
      id: 'upload',
      label: 'Upload de Imagens',
      icon: <Upload size={20} />,
    },
    {
      id: 'mapa',
      label: 'Visualizar Mapa',
      icon: <Map size={20} />,
    },
    {
      id: 'analises',
      label: 'Análises',
      icon: <BarChart3 size={20} />,
      submenu: [
        { id: 'ndvi', label: 'Índice NDVI', icon: <Leaf size={18} /> },
        { id: 'ndwi', label: 'Índice NDWI', icon: <Droplets size={18} /> },
        { id: 'evi', label: 'Índice EVI', icon: <Activity size={18} /> },
        { id: 'uso-solo', label: 'Uso do Solo', icon: <Mountain size={18} /> },
        { id: 'contagem', label: 'Contagem de Plantas', icon: <Trees size={18} /> },
        { id: 'saude', label: 'Saúde das Plantas', icon: <Thermometer size={18} /> },
        { id: 'altura', label: 'Estimativa de Altura', icon: <Scan size={18} /> },
      ],
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: <FileText size={20} />,
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <Settings size={20} />,
    },
    {
      id: 'ajuda',
      label: 'Ajuda',
      icon: <HelpCircle size={20} />,
    },
  ]

  const toggleSubmenu = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#1a1a2e] flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative">
            <img
              src="/logo-icon.png"
              alt="Roboroça"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-white">Robo</span>
              <span className="text-[#6AAF3D]">roça</span>
            </h1>
            <p className="text-xs text-gray-400 tracking-wider">AUTOMAÇÃO AGRÍCOLA</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  if (item.submenu) {
                    toggleSubmenu(item.id)
                  } else {
                    onItemClick(item.id)
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200
                  ${activeItem === item.id
                    ? 'bg-[#6AAF3D] text-white'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.submenu && (
                  <ChevronDown
                    size={18}
                    className={`transition-transform duration-200 ${
                      expandedMenus.includes(item.id) ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Submenu */}
              {item.submenu && expandedMenus.includes(item.id) && (
                <ul className="ml-4 mt-1 space-y-1 border-l-2 border-gray-700 pl-4">
                  {item.submenu.map((subitem) => (
                    <li key={subitem.id}>
                      <button
                        onClick={() => onItemClick(subitem.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
                          ${activeItem === subitem.id
                            ? 'bg-[#6AAF3D]/20 text-[#6AAF3D]'
                            : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'
                          }`}
                      >
                        {subitem.icon}
                        <span>{subitem.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6AAF3D] to-[#1B3A5C] flex items-center justify-center">
            <span className="text-white font-bold">U</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Usuário</p>
            <p className="text-xs text-gray-400">Plano Básico</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
