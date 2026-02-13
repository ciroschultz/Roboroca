'use client'

import { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { login, register, requestPasswordReset, LoginCredentials, RegisterData, User as UserType } from '@/lib/api'

interface AuthScreenProps {
  onAuthSuccess: (user: UserType) => void
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleForgotPassword = async () => {
    if (!email.trim() || !validateEmail(email)) {
      setError('Por favor, insira um email válido para recuperar a senha')
      return
    }
    setResetLoading(true)
    setError(null)
    try {
      await requestPasswordReset(email)
      setResetSent(true)
    } catch {
      setResetSent(true) // Always show success to avoid email enumeration
    } finally {
      setResetLoading(false)
    }
  }

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateForm = (): string | null => {
    if (!email.trim()) return 'Por favor, insira seu email'
    if (!validateEmail(email)) return 'Email inválido'
    if (!password) return 'Por favor, insira sua senha'
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres'

    if (activeTab === 'register') {
      if (!name.trim()) return 'Por favor, insira seu nome'
      if (name.trim().length < 2) return 'O nome deve ter pelo menos 2 caracteres'
      if (password !== confirmPassword) return 'As senhas não coincidem'
    }

    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    try {
      const credentials: LoginCredentials = { email, password }
      const response = await login(credentials)
      onAuthSuccess(response.user)
    } catch (err: any) {
      if (err.status === 401) {
        setError('Email ou senha incorretos')
      } else if (err.status === 0) {
        setError('Erro de conexão. Verifique se o servidor está online.')
      } else {
        setError(err.detail || 'Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    try {
      const data: RegisterData = { name: name.trim(), email, password }
      const response = await register(data)
      onAuthSuccess(response.user)
    } catch (err: any) {
      if (err.status === 400) {
        setError('Este email já está cadastrado')
      } else if (err.status === 0) {
        setError('Erro de conexão. Verifique se o servidor está online.')
      } else {
        setError(err.detail || 'Erro ao criar conta. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setError(null)
    setShowPassword(false)
    setShowConfirmPassword(false)
    setResetSent(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f2027] flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#6AAF3D]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#1B3A5C]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#6AAF3D]/5 to-[#1B3A5C]/5 rounded-full blur-3xl" />
      </div>

      {/* Card de autenticação */}
      <div className="relative w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/logo-icon.png"
              alt="Roboroça"
              className="w-28 h-28 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="text-white">Robo</span>
            <span className="text-[#6AAF3D]">roça</span>
          </h1>
          <p className="text-gray-400 mt-2">Análise Inteligente de Imagens Agrícolas</p>
        </div>

        {/* Card principal */}
        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-700/50">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-4 text-center font-medium transition-all duration-300 ${
                activeTab === 'login'
                  ? 'text-[#6AAF3D] bg-[#6AAF3D]/10 border-b-2 border-[#6AAF3D]'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-4 text-center font-medium transition-all duration-300 ${
                activeTab === 'register'
                  ? 'text-[#6AAF3D] bg-[#6AAF3D]/10 border-b-2 border-[#6AAF3D]'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="p-6 space-y-4">
            {/* Mensagem de erro */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Campo Nome (apenas cadastro) */}
            {activeTab === 'register' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-300">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] focus:ring-1 focus:ring-[#6AAF3D]/50 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Campo Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] focus:ring-1 focus:ring-[#6AAF3D]/50 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] focus:ring-1 focus:ring-[#6AAF3D]/50 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Senha (apenas cadastro) */}
            {activeTab === 'register' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-300">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] focus:ring-1 focus:ring-[#6AAF3D]/50 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* Botão de submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[#6AAF3D] to-[#5a9a34] hover:from-[#5a9a34] hover:to-[#4a8a2a] text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#6AAF3D]/20 hover:shadow-[#6AAF3D]/30"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {activeTab === 'login' ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : (
                activeTab === 'login' ? 'Entrar' : 'Criar Conta'
              )}
            </button>

            {/* Link esqueci senha (apenas login) */}
            {activeTab === 'login' && (
              <div className="text-center text-sm">
                {resetSent ? (
                  <p className="text-green-400">
                    Se o email estiver cadastrado, você receberá instruções para redefinir sua senha. Verifique o console do servidor.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="text-[#6AAF3D] hover:text-[#7abf4d] transition-colors disabled:opacity-50"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Enviando...' : 'Esqueceu a senha?'}
                  </button>
                )}
              </div>
            )}
          </form>

          {/* Footer do card */}
          <div className="px-6 pb-6 space-y-4">
            <p className="text-center text-sm text-gray-500">
              {activeTab === 'login' ? (
                <>
                  Não tem uma conta?{' '}
                  <button
                    onClick={() => switchTab('register')}
                    className="text-[#6AAF3D] hover:text-[#7abf4d] font-medium transition-colors"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  Já tem uma conta?{' '}
                  <button
                    onClick={() => switchTab('login')}
                    className="text-[#6AAF3D] hover:text-[#7abf4d] font-medium transition-colors"
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-700/50" />
              <span className="text-gray-500 text-xs">ou</span>
              <div className="flex-1 h-px bg-gray-700/50" />
            </div>

            {/* Botão Demo */}
            <button
              type="button"
              onClick={() => onAuthSuccess({
                id: 0,
                name: 'Usuário Demo',
                email: 'demo@roboroca.com',
                created_at: new Date().toISOString()
              })}
              className="w-full py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-300 border border-gray-600/50 hover:border-gray-500"
            >
              Entrar como Demonstração
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Roboroça - Automação Agrícola Inteligente
        </p>
      </div>
    </div>
  )
}
