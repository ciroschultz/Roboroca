'use client'

import { useState } from 'react'
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
  Mountain,
  Trees,
  Activity,
  LogOut,
  Bug,
  TreePine,
  Palette,
  GitCompare,
} from 'lucide-react'

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: string
  submenu?: { id: string; label: string; icon: React.ReactNode }[]
}

interface UserData {
  id: number
  name: string
  email: string
}

interface SidebarProps {
  activeItem: string
  onItemClick: (id: string) => void
  currentUser?: UserData | null
  onLogout?: () => void
}

export default function Sidebar({ activeItem, onItemClick, currentUser, onLogout }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['analises'])
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

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
      badge: 'Novo',
    },
    {
      id: 'mapa',
      label: 'Visualizar Mapa',
      icon: <Map size={20} />,
    },
    {
      id: 'analises',
      label: 'Comparação de Análises',
      icon: <BarChart3 size={20} />,
      submenu: [
        { id: 'comparacao', label: 'Comparar Projetos', icon: <GitCompare size={18} /> },
        { id: 'cobertura', label: 'Cobertura Vegetal', icon: <Leaf size={18} /> },
        { id: 'saude-indice', label: 'Índice de Saúde', icon: <Activity size={18} /> },
        { id: 'uso-solo', label: 'Uso do Solo', icon: <Mountain size={18} /> },
        { id: 'contagem', label: 'Contagem de Plantas', icon: <Trees size={18} /> },
        { id: 'saude', label: 'Saúde das Plantas', icon: <Thermometer size={18} /> },
        { id: 'pragas', label: 'Pragas e Doenças', icon: <Bug size={18} /> },
        { id: 'biomassa', label: 'Biomassa', icon: <TreePine size={18} /> },
        { id: 'ndvi', label: 'NDVI / ExG', icon: <Activity size={18} /> },
        { id: 'cores', label: 'Análise de Cores', icon: <Palette size={18} /> },
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
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-gradient-to-b from-[#1a1a2e] to-[#12121e] flex flex-col z-50 border-r border-gray-800/50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700/30">
        <div className="flex items-center gap-3 group">
          <div className="w-12 h-12 relative">
            <div className="absolute inset-0 bg-[#6AAF3D]/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img
              src="/logo-icon.png"
              alt="Roboroça"
              className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-white">Robo</span>
              <span className="text-[#6AAF3D]">roça</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Automação Agrícola</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1 px-3">
          {menuItems.map((item, index) => (
            <li
              key={item.id}
              className="animate-slide-in-left"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => {
                  if (item.submenu) {
                    toggleSubmenu(item.id)
                  } else {
                    onItemClick(item.id)
                  }
                }}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  relative w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300
                  ${activeItem === item.id
                    ? 'bg-gradient-to-r from-[#6AAF3D] to-[#5a9a34] text-white shadow-lg shadow-[#6AAF3D]/20'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {/* Hover background effect */}
                {activeItem !== item.id && (
                  <div
                    className={`
                      absolute inset-0 rounded-xl bg-gray-700/30 transition-opacity duration-300
                      ${hoveredItem === item.id ? 'opacity-100' : 'opacity-0'}
                    `}
                  />
                )}

                {/* Active indicator */}
                {activeItem === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50" />
                )}

                <div className="relative flex items-center gap-3">
                  <span className={`transition-transform duration-300 ${hoveredItem === item.id ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#6AAF3D] text-white rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>

                {item.submenu && (
                  <ChevronDown
                    size={18}
                    className={`relative transition-transform duration-300 ${
                      expandedMenus.includes(item.id) ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Submenu com animação */}
              {item.submenu && (
                <div
                  className={`
                    overflow-hidden transition-all duration-300 ease-out
                    ${expandedMenus.includes(item.id)
                      ? 'max-h-96 opacity-100 mt-1'
                      : 'max-h-0 opacity-0'
                    }
                  `}
                >
                  <ul className="ml-4 space-y-1 border-l-2 border-gray-700/50 pl-4 py-1">
                    {item.submenu.map((subitem, subIndex) => (
                      <li
                        key={subitem.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${subIndex * 30}ms` }}
                      >
                        <button
                          onClick={() => onItemClick(subitem.id)}
                          className={`
                            group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                            ${activeItem === subitem.id
                              ? 'bg-[#6AAF3D]/20 text-[#6AAF3D] border-l-2 border-[#6AAF3D] -ml-[18px] pl-[26px]'
                              : 'text-gray-500 hover:bg-gray-700/20 hover:text-gray-200'
                            }
                          `}
                        >
                          <span className={`transition-all duration-200 ${activeItem === subitem.id ? 'text-[#6AAF3D]' : 'group-hover:text-[#6AAF3D]'}`}>
                            {subitem.icon}
                          </span>
                          <span>{subitem.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer com usuário */}
      <div className="p-4 border-t border-gray-700/30">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-800/30 transition-colors cursor-pointer group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6AAF3D] to-[#1B3A5C] flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
              <span className="text-white font-bold">
                {currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1a2e]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentUser?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {currentUser?.email || 'Plano Básico'}
            </p>
          </div>
        </div>

        {currentUser && onLogout && (
          <button
            onClick={onLogout}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-gray-500 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition-all duration-300 group"
          >
            <LogOut size={18} className="transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Sair da conta</span>
          </button>
        )}
      </div>
    </aside>
  )
}
