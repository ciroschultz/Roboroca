'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  Search,
  User,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Settings,
  HelpCircle,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText,
  Clock,
  Trash2
} from 'lucide-react'
import { useNotifications, type AppNotification } from './NotificationContext'

interface UserData {
  id: number
  name: string
  email: string
}

interface SearchableProject {
  id: string
  name: string
}

interface HeaderProps {
  title: string
  subtitle?: string
  currentUser?: UserData | null
  onLogout?: () => void
  onNavigate?: (view: string) => void
  onProjectSelect?: (projectId: string) => void
  projects?: SearchableProject[]
  compact?: boolean // Modo compacto para uso junto com header mobile
  theme?: 'dark' | 'light' | 'system'
  onThemeToggle?: () => void
}

export default function Header({ title, subtitle, currentUser, onLogout, onNavigate, onProjectSelect, projects = [], compact = false, theme = 'dark', onThemeToggle }: HeaderProps) {
  const isDark = theme !== 'light'
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications()

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Atalho de teclado para busca (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setShowSearch(true)
      }
      if (event.key === 'Escape') {
        setShowSearch(false)
        setShowUserMenu(false)
        setShowNotifications(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-green-400" />
      case 'warning':
        return <AlertTriangle size={18} className="text-yellow-400" />
      case 'error':
        return <AlertTriangle size={18} className="text-red-400" />
      default:
        return <Info size={18} className="text-blue-400" />
    }
  }

  const filteredProjects = searchQuery.trim()
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const handleNavClick = (view: string) => {
    setShowUserMenu(false)
    onNavigate?.(view)
  }

  // Se for modo compacto, renderiza apenas os botões de ação
  if (compact || !title) {
    return (
      <div className="flex items-center gap-2">
        {/* Barra de pesquisa - esconde em telas pequenas */}
        <div className="relative hidden md:block" ref={searchRef}>
          <div
            className={`
              flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-xl
              transition-all duration-300
              ${showSearch ? 'w-72 border-[#6AAF3D]/50' : 'w-48 lg:w-64'}
            `}
          >
            <Search className="ml-3 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="flex-1 py-2 pr-3 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Botões de ação compactos */}
        <button
          onClick={onThemeToggle}
          className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-700/30 transition-all"
          title="Alternar tema"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-700/30 transition-all"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#6AAF3D] text-white text-[10px] font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown de notificações */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#1a1a2e] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 dropdown-menu">
              <div className="p-4 border-b border-gray-700/30 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Notificações</h3>
                  <p className="text-xs text-gray-500">{unreadCount} não lidas</p>
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-[#6AAF3D]">
                    Marcar todas
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="p-3 border-b border-gray-700/20 hover:bg-gray-800/30">
                    <div className="flex gap-2">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{notification.title}</p>
                        <p className="text-xs text-gray-500">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1 p-1 rounded-xl hover:bg-gray-700/30 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6AAF3D] to-[#1B3A5C] flex items-center justify-center">
              {currentUser ? (
                <span className="text-white text-xs font-bold">{getUserInitials(currentUser.name)}</span>
              ) : (
                <User size={16} className="text-white" />
              )}
            </div>
          </button>

          {showUserMenu && currentUser && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a2e] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 dropdown-menu">
              <div className="p-3 border-b border-gray-700/30">
                <p className="text-white font-medium text-sm">{currentUser.name}</p>
                <p className="text-gray-500 text-xs truncate">{currentUser.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => handleNavClick('settings')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/30 rounded-lg"
                >
                  <Settings size={16} /> Configurações
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onLogout?.() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <header className="h-16 bg-gradient-to-r from-[#1a1a2e]/95 to-[#1a1a2e]/90 backdrop-blur-md border-b border-gray-700/30 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Título da página */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>

      {/* Barra de pesquisa e ações */}
      <div className="flex items-center gap-3">
        {/* Barra de pesquisa */}
        <div className="relative" ref={searchRef}>
          <div
            className={`
              flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-xl
              transition-all duration-300
              ${showSearch ? 'w-96 border-[#6AAF3D]/50 shadow-lg shadow-[#6AAF3D]/5' : 'w-72'}
            `}
          >
            <Search className="ml-3 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Pesquisar... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="flex-1 py-2.5 pr-4 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-2 p-1 text-gray-500 hover:text-white rounded transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {showSearch && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 dropdown-menu">
              <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-700/30">
                Resultados para &quot;{searchQuery}&quot;
              </div>
              {filteredProjects.length > 0 ? (
                <div className="py-2 max-h-64 overflow-y-auto">
                  {filteredProjects.slice(0, 8).map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        onProjectSelect?.(project.id)
                        setSearchQuery('')
                        setShowSearch(false)
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-gray-300 hover:bg-gray-700/30 transition-colors"
                    >
                      <FileText size={14} className="text-[#6AAF3D]" />
                      <span>{project.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  Nenhum projeto encontrado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="w-px h-8 bg-gray-700/50" />

        {/* Botões de ação */}
        <div className="flex items-center gap-1">
          {/* Toggle tema */}
          <button
            onClick={onThemeToggle}
            className="relative p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-gray-700/30 transition-all duration-300 group"
            title="Alternar tema"
          >
            <div className="relative w-5 h-5">
              <Sun
                size={20}
                className={`absolute inset-0 transition-all duration-300 ${
                  isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'
                }`}
              />
              <Moon
                size={20}
                className={`absolute inset-0 transition-all duration-300 ${
                  isDark ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'
                }`}
              />
            </div>
          </button>

          {/* Notificações */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`
                relative p-2.5 rounded-xl transition-all duration-300
                ${showNotifications
                  ? 'text-white bg-gray-700/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                }
              `}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#6AAF3D] text-white text-[10px] font-bold rounded-full animate-bounce-in">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de notificações */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-[#1a1a2e] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 dropdown-menu">
                <div className="p-4 border-b border-gray-700/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Notificações</h3>
                    <p className="text-xs text-gray-500">{unreadCount} não lidas</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-[#6AAF3D] hover:text-[#7abf4d] transition-colors"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`
                          relative p-4 border-b border-gray-700/20 hover:bg-gray-800/30 transition-colors
                          ${!notification.read ? 'bg-gray-800/20' : ''}
                        `}
                      >
                        {!notification.read && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#6AAF3D] rounded-full" />
                        )}
                        <div className="flex gap-3 pl-2">
                          <div className="shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{notification.message}</p>
                            <p className="text-xs text-gray-600 mt-1">{notification.time}</p>
                          </div>
                          <div className="flex items-start gap-1">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 text-gray-600 hover:text-[#6AAF3D] rounded transition-colors"
                                title="Marcar como lida"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <Bell size={32} className="mx-auto text-gray-700 mb-3" />
                      <p className="text-gray-500 text-sm">Nenhuma notificação</p>
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-700/30">
                    <button
                      onClick={() => { clearAll(); setShowNotifications(false) }}
                      className="w-full py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                    >
                      Limpar todas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Perfil com dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-300
                ${showUserMenu
                  ? 'bg-gray-700/50'
                  : 'hover:bg-gray-700/30'
                }
              `}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6AAF3D] to-[#1B3A5C] flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105">
                  {currentUser ? (
                    <span className="text-white text-sm font-bold">
                      {getUserInitials(currentUser.name)}
                    </span>
                  ) : (
                    <User size={18} className="text-white" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1a2e]" />
              </div>
              {currentUser && (
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Dropdown menu do usuário */}
            {showUserMenu && currentUser && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1a2e] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 dropdown-menu">
                {/* Header do menu */}
                <div className="p-4 bg-gradient-to-br from-[#6AAF3D]/10 to-transparent border-b border-gray-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6AAF3D] to-[#1B3A5C] flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg font-bold">
                        {getUserInitials(currentUser.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{currentUser.name}</p>
                      <p className="text-gray-400 text-sm truncate">{currentUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Opções do menu */}
                <div className="p-2">
                  <button
                    onClick={() => handleNavClick('settings')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"
                  >
                    <User size={18} />
                    <span>Meu Perfil</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('settings')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"
                  >
                    <Settings size={18} />
                    <span>Configurações</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('reports')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"
                  >
                    <FileText size={18} />
                    <span>Meus Relatórios</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('help')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"
                  >
                    <HelpCircle size={18} />
                    <span>Ajuda e Suporte</span>
                  </button>
                </div>

                {/* Separador e logout */}
                <div className="p-2 border-t border-gray-700/30">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      onLogout?.()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
