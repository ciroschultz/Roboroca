'use client'

import { Upload, FolderOpen, BarChart3, FileText } from 'lucide-react'

interface EmptyStateProps {
  type: 'dashboard' | 'projects' | 'reports'
  onUploadClick?: () => void
}

export default function EmptyState({ type, onUploadClick }: EmptyStateProps) {
  const content = {
    dashboard: {
      icon: <BarChart3 size={64} className="text-gray-600" />,
      title: 'Seu dashboard está vazio',
      description: 'Faça upload de imagens de drone ou satélite para começar a analisar suas propriedades e ver os dados aqui.',
      buttonText: 'Fazer Primeiro Upload',
    },
    projects: {
      icon: <FolderOpen size={64} className="text-gray-600" />,
      title: 'Nenhum projeto ainda',
      description: 'Seus projetos aparecerão aqui após você fazer upload de imagens. Cada upload cria um novo projeto automaticamente.',
      buttonText: 'Criar Primeiro Projeto',
    },
    reports: {
      icon: <FileText size={64} className="text-gray-600" />,
      title: 'Nenhum relatório gerado',
      description: 'Os relatórios são gerados automaticamente após o processamento das imagens. Faça um upload para começar.',
      buttonText: 'Fazer Upload',
    },
  }

  const { icon, title, description, buttonText } = content[type]

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-32 h-32 rounded-full bg-gray-800/50 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-md mb-6">{description}</p>
      <button
        onClick={onUploadClick}
        className="flex items-center gap-2 px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-semibold rounded-xl transition-colors"
      >
        <Upload size={20} />
        {buttonText}
      </button>

      {/* Dicas */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
        <div className="text-center p-4">
          <div className="w-12 h-12 rounded-full bg-[#6AAF3D]/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-[#6AAF3D] font-bold">1</span>
          </div>
          <p className="text-sm text-gray-400">Faça upload de imagens de drone ou satélite</p>
        </div>
        <div className="text-center p-4">
          <div className="w-12 h-12 rounded-full bg-[#6AAF3D]/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-[#6AAF3D] font-bold">2</span>
          </div>
          <p className="text-sm text-gray-400">O sistema analisa automaticamente e cria um projeto</p>
        </div>
        <div className="text-center p-4">
          <div className="w-12 h-12 rounded-full bg-[#6AAF3D]/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-[#6AAF3D] font-bold">3</span>
          </div>
          <p className="text-sm text-gray-400">Acesse o relatório completo com todos os dados</p>
        </div>
      </div>
    </div>
  )
}
