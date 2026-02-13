'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User as UserIcon,
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
  Monitor,
  Loader2,
  X,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import {
  updateUserProfile,
  updateUserPreferences,
  changePassword,
  getCurrentUser,
  type User,
  type UpdateProfileData,
} from '@/lib/api'
import { useToast } from './Toast'

interface SettingsPageProps {
  currentUser?: User | null
  onUserUpdate?: (user: User) => void
}

type SettingsSection = 'profile' | 'notifications' | 'appearance' | 'security' | 'language' | 'storage'

export default function SettingsPage({ currentUser, onUserUpdate }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const toast = useToast()

  // Profile form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [bio, setBio] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Preferences state
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(false)
  const [language, setLanguage] = useState('pt-BR')

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Load user data into form
  const loadUserData = useCallback((user: User) => {
    setFullName(user.name || '')
    setPhone(user.phone || '')
    setCompany(user.company || '')
    setBio(user.bio || '')
    setTheme((user.theme as 'dark' | 'light' | 'system') || 'dark')
    setEmailNotifications(user.email_notifications ?? true)
    setPushNotifications(user.push_notifications ?? true)
    setWeeklyReport(user.weekly_report ?? false)
    setLanguage(user.language || 'pt-BR')
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadUserData(currentUser)
    }
  }, [currentUser, loadUserData])

  // Fetch latest user data on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getCurrentUser()
        loadUserData(user)
        onUserUpdate?.(user)
      } catch {
        // Ignore - will use passed currentUser
      }
    }
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      const data: UpdateProfileData = {
        full_name: fullName,
        phone,
        bio,
        company,
      }
      const updatedUser = await updateUserProfile(data)
      onUserUpdate?.(updatedUser)
      toast.success('Perfil atualizado com sucesso')
    } catch (err: any) {
      toast.error(err.detail || 'Erro ao salvar perfil')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleToggleNotification = async (
    field: 'email_notifications' | 'push_notifications' | 'weekly_report',
    newValue: boolean
  ) => {
    // Optimistic update
    if (field === 'email_notifications') setEmailNotifications(newValue)
    if (field === 'push_notifications') setPushNotifications(newValue)
    if (field === 'weekly_report') setWeeklyReport(newValue)

    try {
      const updatedUser = await updateUserPreferences({ [field]: newValue })
      onUserUpdate?.(updatedUser)
    } catch (err: any) {
      // Revert on error
      if (field === 'email_notifications') setEmailNotifications(!newValue)
      if (field === 'push_notifications') setPushNotifications(!newValue)
      if (field === 'weekly_report') setWeeklyReport(!newValue)
      toast.error(err.detail || 'Erro ao atualizar preferência')
    }
  }

  const handleThemeChange = async (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme)
    try {
      const updatedUser = await updateUserPreferences({ theme: newTheme })
      onUserUpdate?.(updatedUser)
    } catch (err: any) {
      toast.error(err.detail || 'Erro ao atualizar tema')
    }
  }

  const handleLanguageChange = async (newLang: string) => {
    setLanguage(newLang)
    try {
      const updatedUser = await updateUserPreferences({ language: newLang })
      onUserUpdate?.(updatedUser)
    } catch (err: any) {
      toast.error(err.detail || 'Erro ao atualizar idioma')
    }
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    if (!currentPassword) {
      setPasswordError('Insira a senha atual')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('As senhas não coincidem')
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Senha alterada com sucesso')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err: any) {
      setPasswordError(err.detail || 'Erro ao alterar senha')
    } finally {
      setPasswordSaving(false)
    }
  }

  const sections = [
    { id: 'profile' as const, label: 'Perfil', icon: UserIcon },
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
                      {fullName.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2 bg-[#6AAF3D] rounded-xl text-white hover:bg-[#5a9a34] transition-colors shadow-lg">
                    <Camera size={16} />
                  </button>
                </div>
                <div>
                  <p className="text-white font-medium">{fullName || 'Usuário'}</p>
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
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Empresa/Fazenda</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nome da sua propriedade"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre você ou sua propriedade..."
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="flex items-center gap-2 px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:opacity-50 text-white font-medium rounded-xl transition-colors btn-press"
            >
              {profileSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {profileSaving ? 'Salvando...' : 'Salvar alterações'}
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
                  onClick={() => handleToggleNotification('email_notifications', !emailNotifications)}
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
                  onClick={() => handleToggleNotification('push_notifications', !pushNotifications)}
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
                  onClick={() => handleToggleNotification('weekly_report', !weeklyReport)}
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
                    onClick={() => handleThemeChange(option.id)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl border transition-all relative
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
              <button
                onClick={() => {
                  setShowPasswordModal(true)
                  setPasswordError(null)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                }}
                className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Key className="text-blue-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Alterar senha</p>
                    <p className="text-gray-500 text-sm">Altere sua senha de acesso</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-500 group-hover:text-white transition-colors" size={20} />
              </button>

              <div className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <Shield className="text-green-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Autenticação em duas etapas</p>
                    <p className="text-gray-500 text-sm">Em breve</p>
                  </div>
                </div>
              </div>

              <div className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Smartphone className="text-purple-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Dispositivos conectados</p>
                    <p className="text-gray-500 text-sm">Em breve</p>
                  </div>
                </div>
              </div>
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
                onChange={(e) => handleLanguageChange(e.target.value)}
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
                <span className="text-gray-400 text-sm">Em breve</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-gradient-to-r from-[#6AAF3D] to-[#5a9a34] rounded-full" />
              </div>
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

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Alterar Senha</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {passwordError && (
              <div className="flex items-center gap-3 p-3 mb-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Senha atual</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                    placeholder="Sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nova senha</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordSaving}
                className="flex-1 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {passwordSaving ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                {passwordSaving ? 'Salvando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
