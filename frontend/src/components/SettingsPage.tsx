'use client'

import { useState } from 'react'
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  HardDrive,
  Mail,
  Smartphone,
  Key,
  Camera,
  Save,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'

interface UserData {
  id: number
  name: string
  email: string
}

interface SettingsPageProps {
  currentUser?: UserData | null
}

type SettingsSection = 'profile' | 'notifications' | 'appearance' | 'security' | 'language' | 'storage'

export default function SettingsPage({ currentUser }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(false)
  const [language, setLanguage] = useState('pt-BR')

  const sections = [
    { id: 'profile' as const, label: 'Perfil', icon: User },
    { id: 'notifications' as const, label: 'Notificações', icon: Bell },
    { id: 'appearance' as const, label: 'Aparência', icon: Palette },
    { id: 'security' as const, label: 'Segurança', icon: Shield },
    { id: 'language' as const, label: 'Idioma', icon: Globe },
    { id: 'storage' as const, label: 'Armazenamento', icon: HardDrive },
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Informações do Perfil</h3>

              {/* Avatar */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#6AAF3D] to-[#1B3A5C] flex items-center justify-center shadow-xl">
                    <span className="text-white text-3xl font-bold">
                      {currentUser?.name.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2 bg-[#6AAF3D] rounded-xl text-white hover:bg-[#5a9a34] transition-colors shadow-lg">
                    <Camera size={16} />
                  </button>
                </div>
                <div>
                  <p className="text-white font-medium">{currentUser?.name || 'Usuário'}</p>
                  <p className="text-gray-500 text-sm">{currentUser?.email || 'email@exemplo.com'}</p>
                  <button className="mt-2 text-sm text-[#6AAF3D] hover:text-[#7abf4d] transition-colors">
                    Alterar foto
                  </button>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nome completo</label>
                  <input
                    type="text"
                    defaultValue={currentUser?.name || ''}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={currentUser?.email || ''}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Telefone</label>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Empresa/Fazenda</label>
                  <input
                    type="text"
                    placeholder="Nome da sua propriedade"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                <textarea
                  rows={3}
                  placeholder="Conte um pouco sobre você ou sua propriedade..."
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors resize-none"
                />
              </div>
            </div>

            <button className="flex items-center gap-2 px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-medium rounded-xl transition-colors btn-press">
              <Save size={18} />
              Salvar alterações
            </button>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Preferências de Notificação</h3>

            <div className="space-y-4">
              {/* Email notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Mail className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Notificações por Email</p>
                    <p className="text-gray-500 text-sm">Receba atualizações sobre suas análises por email</p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    emailNotifications ? 'bg-[#6AAF3D]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      emailNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Push notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Smartphone className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Notificações Push</p>
                    <p className="text-gray-500 text-sm">Receba alertas em tempo real no navegador</p>
                  </div>
                </div>
                <button
                  onClick={() => setPushNotifications(!pushNotifications)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    pushNotifications ? 'bg-[#6AAF3D]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      pushNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Weekly report */}
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <Bell className="text-green-400" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Relatório Semanal</p>
                    <p className="text-gray-500 text-sm">Receba um resumo semanal das suas propriedades</p>
                  </div>
                </div>
                <button
                  onClick={() => setWeeklyReport(!weeklyReport)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    weeklyReport ? 'bg-[#6AAF3D]' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      weeklyReport ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Aparência</h3>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">Tema</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'dark' as const, label: 'Escuro', icon: Moon },
                  { id: 'light' as const, label: 'Claro', icon: Sun },
                  { id: 'system' as const, label: 'Sistema', icon: Monitor },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                      ${theme === option.id
                        ? 'bg-[#6AAF3D]/20 border-[#6AAF3D] text-[#6AAF3D]'
                        : 'bg-gray-800/30 border-gray-700/30 text-gray-400 hover:border-gray-600'
                      }
                    `}
                  >
                    <option.icon size={24} />
                    <span className="text-sm font-medium">{option.label}</span>
                    {theme === option.id && (
                      <Check size={16} className="absolute top-2 right-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
              <p className="text-yellow-400 text-sm">
                O tema claro ainda está em desenvolvimento e será lançado em breve.
              </p>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Segurança</h3>

            <div className="space-y-4">
              <button className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Key className="text-blue-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Alterar senha</p>
                    <p className="text-gray-500 text-sm">Última alteração há 30 dias</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-500 group-hover:text-white transition-colors" size={20} />
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <Shield className="text-green-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Autenticação em duas etapas</p>
                    <p className="text-gray-500 text-sm">Não ativado</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-500 group-hover:text-white transition-colors" size={20} />
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Smartphone className="text-purple-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Dispositivos conectados</p>
                    <p className="text-gray-500 text-sm">2 dispositivos ativos</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-500 group-hover:text-white transition-colors" size={20} />
              </button>
            </div>
          </div>
        )

      case 'language':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Idioma e Região</h3>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Idioma do sistema</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#6AAF3D] transition-colors"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Formato de data</label>
              <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#6AAF3D] transition-colors">
                <option>DD/MM/AAAA</option>
                <option>MM/DD/AAAA</option>
                <option>AAAA-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Unidade de área</label>
              <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#6AAF3D] transition-colors">
                <option>Hectares (ha)</option>
                <option>Acres</option>
                <option>Metros quadrados (m²)</option>
              </select>
            </div>
          </div>
        )

      case 'storage':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Armazenamento</h3>

            {/* Usage bar */}
            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Uso do armazenamento</span>
                <span className="text-gray-400 text-sm">2.4 GB de 10 GB</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full w-[24%] bg-gradient-to-r from-[#6AAF3D] to-[#5a9a34] rounded-full" />
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#6AAF3D]" />
                  <span className="text-gray-400">Imagens (1.8 GB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-400">Relatórios (0.6 GB)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <HardDrive className="text-blue-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Gerenciar arquivos</p>
                    <p className="text-gray-500 text-sm">Ver e excluir arquivos antigos</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-500 group-hover:text-white transition-colors" size={20} />
              </button>

              <button className="w-full p-4 bg-[#6AAF3D]/20 hover:bg-[#6AAF3D]/30 border border-[#6AAF3D]/30 rounded-xl text-[#6AAF3D] font-medium transition-colors">
                Aumentar armazenamento
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegação */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-2 sticky top-20">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${activeSection === section.id
                    ? 'bg-[#6AAF3D] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }
                `}
              >
                <section.icon size={20} />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="lg:col-span-3">
          <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
