'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { confirmPasswordReset } from '@/lib/api'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Token de redefinição não encontrado na URL')
      return
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset(token, newPassword)
      setSuccess(true)
    } catch (err: any) {
      setError(err.detail || 'Token inválido ou expirado. Solicite um novo link de redefinição.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Senha redefinida!</h2>
        <p className="text-gray-400 mb-6">Sua senha foi alterada com sucesso.</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-medium rounded-xl transition-colors"
        >
          Ir para o login
        </a>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Redefinir Senha</h2>
        <p className="text-gray-400">Insira sua nova senha abaixo.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!token && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>Token não encontrado. Use o link enviado ao seu email.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Nova senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
              disabled={loading || !token}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar nova senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
            disabled={loading || !token}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Redefinindo...
            </>
          ) : (
            'Redefinir Senha'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        <a href="/" className="text-[#6AAF3D] hover:text-[#7abf4d] transition-colors">
          Voltar ao login
        </a>
      </p>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f2027] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#6AAF3D]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#1B3A5C]/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-white">Robo</span>
            <span className="text-[#6AAF3D]">roça</span>
          </h1>
        </div>

        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-gray-400" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
